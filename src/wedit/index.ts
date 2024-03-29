import h from 'web/html'
import snack from 'web/snack'
import {newLayout} from 'game/dock'
import {Box, boxGrow, boxIn} from 'game/geo'
import {gridEach, gridSel, gridTiles} from 'game/grid'
import {Clip, Img, Pal, Pic, growPic, Spot} from 'game/pix'
import {Grid, Lvl, TileInfo, Tset} from 'game/lvl'
import {View, app, chat, menu} from 'app'
import {Handler, Routes} from 'app/router'
import {Subs} from 'app/hub'
import {Slots, WorldData} from './world'
import {WorldView, worldSel, worldIndex} from './view_world'
import {PicData} from './view_img'
import './wedit.css'

export interface WeditArgs {
	w?:string
	top?:string
	id?:string
	sub?:string
	xtra?:string
}

const loading = h('', "Lädt Editor")
export class WeditView implements View {
	name="wedit"
	label="World Editor"
	subs?:Subs
	routes:Routes

	a:WeditArgs = {}
	dock=newLayout("#wedit")

	worlds:string[] = []
	w?:WorldView

	constructor() {
		const handler:Handler = (args:string)=> {
			const [w, top, id, sub, xtra] = args?.split('/') || []
			this.setArgs({w, top, id, sub, xtra})
		}
		this.routes = {
			'/wedit': handler,
			'/wedit/..': handler,
		}
	}
	start() {
		app.on(this.subs = editorSubs(this))
		h.add(this.dock.head, h('', menu()))
		const chatel = chat.start()
		this.dock.add({label:'Chat', el:chatel, sel:'.dyn'})
		return this.dock.el
	}
	stop() {
		chat.stop()
		app.off(this.subs!)
		this.w = undefined
		this.worlds = []
		h.repl(this.dock.head)
		this.dock.filter(() => false)
	}
	setArgs(a:WeditArgs):void {
		this.a = a
		const {worlds, w, dock} = this
		if (app.cur != this) {
			app.send('enter', {room:'wedit'})
			h.repl(dock.main, loading)
			return
		}
		if (!a.w || w?.d.name != a.w) {
			if (w) w.stop()
			this.w = undefined
			if (!a.w) {
				// enter wedit room
				if (!worlds.length) app.send('enter', {room:'wedit'})
				// or show world select
				else h.repl(dock.main, worldSel(worlds))
			} else {
				h.repl(dock.main, loading)
				app.send('world.open', {name:a.w})
			}
			return
		}
		if (!a.top) {
			// show world overview
			h.repl(dock.main, worldIndex(w.d))
			return
		}
		// check active topic
		if (!a.id) {
			// show topic overview
			w.topOpen(a.top)
			h.repl(dock.main, w.topv!.el)
			return
		}
		// check active game object
		const id = parseInt(a.id)
		// show topic detail
		if (a.top == 'lvl') {
			if (w?.lvlv?.lvl.id != id) {
				const lvl = w?.d.lvl.get(id)
				if (lvl) {
					h.repl(dock.main, loading)
					app.send('lvl.open', {id})
				} else {
					snack.show("Level nicht gefunden")
				}
				return
			}
		} else if (a.top == 'img') {
			const iv = w?.imgv
			if (iv?.img.id != id) {
				const img = w?.d.img.get(id)
				if (img) {
					h.repl(dock.main, loading)
					app.send('img.open', {id})
				} else {
					snack.show("Asset nicht gefunden")
				}
				return
			}
			if (a.sub) {
				const clip = w?.d.clip.get(parseInt(a.sub))
				if (clip) {
					let pic
					if (a.xtra) pic = w?.d.pics.get(parseInt(a.xtra))
					iv.show(clip, pic)
				} else {
					snack.show("Clip nicht gefunden")
				}
			} else {
				iv.show()
			}
		} else  {
			w?.clean()
			w.topOpen(a.top, id)
			h.repl(dock.main, w.topv!.el)
		}
	}
}
app.addView(new WeditView())

const editorSubs = (v:WeditView):Subs => {
	type handler = (res:any,subj?:string)=>void
	const logErr:handler = (res, subj) => {
		snack.show("Fehler "+ subj +": "+ res.err)
		console.error("message error: "+ subj, res.err)
	}
	const checkErr = (h:handler):handler => (res, subj) => (res?.err ? logErr : h)(res, subj)
	const checkW = (h:(w:WorldView, res:any, subj?:string)=>void):handler => (res, subj) => {
		if (res?.err) logErr(res, subj)
		else if (!v.w) logErr({err:"not subscribed"}, subj)
		else h(v.w, res, subj)
	}
	return {
	"wedit.init": checkErr(res => {
		v.worlds = res.worlds||[]
		v.setArgs(v.a)
	}),
	"world.new": checkErr(res => {
		// update worlds list
		v.worlds.push(res.name)
		v.worlds.sort()
		v.setArgs(v.a)
		// TODO render worldSel if shown
	}),
	"world.del": checkErr(res => {
		// delete from worlds list
		v.worlds = v.worlds.filter(w => w == res.name)
		// exit editor if editing the world
		// render worldSel if show
		if (!v.w || v.w.d.name == res.name) v.setArgs({})
	}),
	"world.open": checkErr(res => {
		const wd = res as WorldData
		wd.pics = new Map()
		wd.pal = new Slots(res.pal)
		wd.spot = new Slots(res.spot)
		wd.img = new Slots(res.img)
		wd.clip = new Slots(res.clip)
		wd.tset = new Slots(res.tset)
		wd.lvl = new Slots(res.lvl)
		if (v.w) v.w.stop()
		v.w = new WorldView(wd, v.dock)
		v.setArgs(v.a)
	}),
	"pal.new": checkW((w, res:Pal) => {
		// add pal to world store
		w.d.pal.set(res.id, res)
		// and update tree view
		checkTopv(w, "pal", res.id, false)
		// TODO think about how to update the pal view and pal select modal
	}),
	"pal.del": checkW((w, res) => {
		// delete pal from world store
		w.d.pal.set(res.id, null)
		// we only allow deletion of unused pals
		checkTopv(w, "pal", res.id, true)
	}),
	"pal.edit": checkW((w, res) => {
		// lookup pal
		const p = w.d.pal.get(res.id)
		if (!p) return
		// update feature
		if (res.name && res.name != p.name) {
			p.name = res.name
			checkTopv(w, "pal", res.id, false)
		}
		if (res.kind) p.kind = res.kind
		const fmod = res.del || res.feats?.length
		if (fmod) {
			applySlice(res, p.feats, res.feats)
			p.cache = undefined
		}
		w.imgv?.updatePal(p)
	}),
	"pal.feat": checkW((w, res) => {
		// lookup pal
		const p = w.d.pal.get(res.id)
		if (!p) return
		if (!p.feats) p.feats = []
		// update feature
		let f = p.feats.find(f => f.name == res.feat)
		if (!f) p.feats.push(f = {name:res.feat, colors:[]})
		applySlice(res, f.colors, res.ins)
		p.cache = undefined
		w.imgv?.updatePal(p)
	}),
	"spot.new": checkW((w, res:Spot) => {
		w.d.spot.set(res.id, res)
		checkTopv(w, "spot", res.id, false)
	}),
	"spot.del": checkW((w, res) => {
		w.d.spot.set(res.id, null)
		checkTopv(w, "spot", res.id, true)
	}),
	"spot.edit": checkW((w, res:Spot) => {
		const sp = w.d.spot.get(res.id)
		if (!sp) return
		Object.assign(sp, res)
		checkTopv(w, "spot", res.id, false)
	}),
	"img.new": checkW((w, res:Img) => {
		// add img to world store
		w.d.img.set(res.id, res)
		checkTopv(w, "img", res.id, false)
	}),
	"img.del": checkW((w, res) => {
		// delete img from world store
		w.d.img.set(res.id, null)
		checkTopv(w, "img", res.id, true)
	}),
	"img.open": checkW((w, res:PicData) => {
		// open clip editor
		res.pics = res.pics.map(pic => gridTiles<number>(pic, pic.raw) as Pic)
		w.imgOpen(res)
		v.setArgs(v.a)
	}),
	"img.edit": checkW((w, res) => {
		// lookup img and edit
		const img = w.d.img.get(res.id)
		if (!img) return
		const modp = img.pal != res.pal
		Object.assign(img, res)
		checkTopv(w, "img", res.id, false)
		if (modp && w.imgv?.img.id == res.id) {
			w.imgv?.editPal()
		}
	}),
	"clip.new": checkW((w, res:Clip) => {
		w.d.clip.set(res.id, res)
		if (w.imgv?.img.id == res.img) w.imgv?.updateClip(res)
	}),
	"clip.del": checkW((w, res) => {
		// delete clip from world store
		const old = w.d.clip.get(res.id)
		if (!old) return
		w.d.clip.set(res.id, null)
		if (w.imgv?.img.id == old.img) w.imgv?.updateClip()
	}),
	"clip.edit": checkW((w, res) => {
		// lookup clip and edit
		const cl = w.d.clip.get(res.id)
		if (!cl) return
		if (res.name && res.name != cl.name) {
			cl.name = res.name
			w.treev.update()
		}
		if (res.w && res.w != cl.w) {
			cl.w = res.w
		}
		if (res.h && res.h != cl.h) {
			cl.h = res.h
		}
		if (res.loop && res.loop != cl.loop) {
			cl.loop = res.loop
		}
		if (res.pics) res.pics.forEach((p:Pic) => {
			w.d.pics.set(p.id, gridTiles<number>(p, p.raw) as Pic)
		})
		if (!cl.seq) cl.seq = []
		applySlice(res, cl.seq, res.seq)
		if (w.imgv?.clip?.id == cl.id) {
			w.imgv.clipv?.update()
		}
	}),
	"pic.edit": checkW((w, res) => {
		// lookup pic and edit
		const pic = w.d.pics?.get(res.pic)
		if (!pic) return
		if (res.repl) {
			const {x, y, w, h} = res
			Object.assign(pic, {x, y, w, h, raw:Array(w*h).fill(0)})
		} else if (!boxIn(res, pic)) growPic(pic, res)
		if (res.fill !== undefined) {
			if (res.raw?.length) {
				const sel = gridSel(res, res.raw)
				gridEach(sel, p => pic.set(p, res.fill), pic, false)
			} else {
				gridEach(pic, p => pic.set(p, res.fill), res)
			}
		} else {
			const img = gridTiles<number>(res, res.raw)
			gridEach(img, (p, t) => pic.set(p, t), pic,
				!res.copy ? 0 : undefined)
		}
		// repaint img editor if active pic
		w.imgv?.updatePic(pic)
	}),
	"tset.new": checkW((w, res:Tset) => {
		w.d.tset.set(res.id, res)
		checkTopv(w, "tset", res.id, false)
	}),
	"tset.del": checkW((w, res) => {
		// delete tset from world store
		w.d.tset.set(res.id, null)
		// we can only delete unused tsets but we can have a topic view open
		checkTopv(w, "tset", res.id, true)
	}),
	"tset.edit": checkW((w, res) => {
		// lookup tset and edit
		const ts = w.d.tset.get(res.id)
		if (!ts) return
		Object.assign(ts, res)
		ts.cache = undefined
		checkTopv(w, "tset", res.id, false)
		w.lvlv?.updateTset(ts)
	}),
	"tset.tile": checkW((w, res) => {
		// lookup tset and edit tile
		const ts = w.d.tset.get(res.id)
		if (!ts) return
		let t = ts.infos.find(t => t.tile == res.tile)
		delete(res.id)
		if (!t) ts.infos.push(res as TileInfo)
		else Object.assign(t, res)
		ts.cache = undefined
		w.lvlv?.updateTset(ts)
	}),
	"lvl.new": checkW((w, res:Lvl) => {
		w.d.lvl.set(res.id, res)
		checkTopv(w, "lvl", res.id, false)
	}),
	"lvl.del": checkW((w, res) => {
		// delete lvl from world store
		w.d.lvl.set(res.id, null)
		// TODO switch lvl if lvl is active in editor
		checkTopv(w, "lvl", res.id, true)
	}),
	"lvl.open": checkW((w, res) => {
		w.lvlOpen(gridTiles<number>(res, res.raw) as Grid)
	}),
	"lvl.edit": checkW((w, res) => {
		// lookup lvl and edit
		const lv = w.d.lvl.get(res.id)
		if (!lv) return
		const modts = lv.tset != res.tset
		Object.assign(lv, res)
		checkTopv(w, "lvl", res.id, false)
		if (modts && w.lvlv?.lvl.id == lv.id) {
			w.lvlv.editTset()
		}
	}),
	"grid.edit": checkW((w, res) => {
		// lookup lvl then grid and edit
		const lvl = w.d.lvl.get(res.id)
		if (!lvl) return
		if (w.d.grid?.id != lvl.grid) return
		const gr = w.d.grid
		if (res.repl) {
			const {x, y, w, h} = res
			Object.assign(lvl, {x, y, w, h, raw:Array(w*h).fill(0)})
		} else if (!boxIn(res, gr)) growLevel(gr, res)
		if (res.fill !== undefined) {
			if (res.raw?.length) {
				const sel = gridSel(res, res.raw)
				gridEach(sel, p => gr.set(p, res.fill), gr, false)
			} else {
				gridEach(gr, p => gr.set(p, res.fill), res)
			}
		} else {
			const img = gridTiles<number>(res, res.raw)
			gridEach(img, (p, t) => gr.set(p, t), gr,
				!res.copy ? 0 : undefined)
		}
		// update lvl if active
		if (w.lvlv?.lvl?.id == lvl.id) w.lvlv.ed.repaint()
	}),
}}

interface SliceReq {
	idx?:number
	del?:number
}
function applySlice<T>(req:SliceReq, old:T[], ins?:T[]) {
	let args:any = [req.idx||0, req.del||0]
	if (ins) args = args.concat(ins)
	old.splice.apply(old, args)
}

function growLevel(p:Grid, o:Box) {
	if (o.w*o.h<=0||boxIn(o, p)) return
	const b = boxGrow(p, o)
	const tmp = gridTiles<number>(b)
	gridEach(p, (p, t) => tmp.set(p, t))
	Object.assign(p, tmp)
}

function checkTopv(w:WorldView, top:string, id:number, del:boolean) {
	// update tree view
	w.treev.update()
	const v = w.topv
	if (v && v.top == top) {
		if (del && v.id == id) app.rr.go("/wedit/"+ w.d.name +"/"+ top)
		else if (!v.id || v.id == id) v.update()
	}
}
