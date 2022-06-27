import h from 'web/html'
import {newLayout, Layout} from 'game/dock'
import {Box, boxGrow, boxIn} from 'game/geo'
import {gridEach, gridSel, gridTiles} from 'game/grid'
import {Clip, Img, Pal, Pic, growPic} from 'game/pix'
import {Grid, Lvl, TileInfo, Tset} from 'game/lvl'
import {View, app, chat, menu} from 'app'
import {Handler} from 'app/router'
import {Subs} from 'app/hub'
import {Slots, WorldData} from './world'
import {WorldView, worldSel, worldIndex, topicIndex} from './view_world'
import {PicData} from './view_img'
import './wedit.css'
import {TopicView} from './view_top'

export interface WeditView extends View {
	dock:Layout
	worlds:string[]
	a:WeditArgs
	w?:WorldView
	setArgs(a:WeditArgs):void
}

export interface WeditArgs {
	w?:string
	top?:string
	id?:string
	sub?:string
	xtra?:string
}

const handler:Handler = (args:string)=> {
	const [w, top, id, sub, xtra] = args?.split('/') || []
	v.setArgs({w, top, id, sub, xtra})
}

const loading = h('', "Lädt Editor")

const v:WeditView = {name:"wedit", label:"World Editor",
	dock:newLayout("#wedit"),
	worlds:[], a:{},
	routes: {
		'/wedit': handler,
		'/wedit/..': handler,
	},
	setArgs(a:WeditArgs) {
		this.a = a
		if (app.cur != this) {
			app.send('enter', {room:'wedit'})
			h.repl(v.dock.main, loading)
			return
		}
		if (!a.w) {
			if (v.w) v.w.stop()
			v.w = undefined
			// enter wedit room
			if (!v.worlds.length) app.send('enter', {room:'wedit'})
			// or show world select
			else h.repl(v.dock.main, worldSel(v.worlds))
			return
		}
		// check active world
		if (v.w?.d.name != a.w) {
			if (v.w) v.w.stop()
			v.w = undefined
			h.repl(v.dock.main, loading)
			app.send('world.open', {name:a.w})
			return
		}
		if (!a.top) {
			// show world overview
			h.repl(v.dock.main, worldIndex(v.w.d))
			return
		}
		// check active topic
		if (!a.id) {
			// show topic overview
			const topv = new TopicView(v.w.d, a.top)
			h.repl(v.dock.main, topv.el)
			return
		}
		// check active game object
		const id = parseInt(a.id)
		// show topic detail
		if (a.top == 'lvl') {
			if (v.w?.lvlv?.lvl.id != id) {
				const lvl = v.w?.d.lvl.get(id)
				if (lvl) {
					h.repl(v.dock.main, loading)
					app.send('lvl.open', {id})
					return
				}
			}
		} else if (a.top == 'img') {
			const iv = v.w?.imgv
			if (iv?.img.id != id) {
				const img = v.w?.d.img.get(id)
				if (img) {
					h.repl(v.dock.main, loading)
					app.send('img.open', {id})
					return
				}
			}
			if (iv && a.sub) {
				const clip = v.w?.d.clip.get(parseInt(a.sub))
				if (!clip) return // TODO inform error
				let pic
				if (a.xtra) pic = v.w?.d.pics.get(parseInt(a.xtra))
				iv.show(clip, pic)
				return
			}
		} else  {
			const topv = new TopicView(v.w.d, a.top, id)
			h.repl(v.dock.main, topv.el)
		}
	},
	start() {
		app.on(v.subs = editorSubs(v))
		h.add(v.dock.head, h('', menu()))
		const chatel = chat.start()
		v.dock.add({label:'Chat', el:chatel, sel:'.dyn'})
		return v.dock.el
	},
	stop() {
		chat.stop()
		app.off(v.subs!)
		v.w = undefined
		v.worlds = []
		h.repl(v.dock.head)
		v.dock.filter(() => false)
	},
}
app.addView(v)

const editorSubs = (v:WeditView):Subs => {
	type handler = (res:any,subj?:string)=>void
	const logErr:handler = (res, subj) => {
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
		w.treev.update()
		// TODO think about how to update the pal view and pal select modal
	}),
	"pal.del": checkW((w, res) => {
		// delete pal from world store
		w.d.pal.set(res.id, null)
		// update tree view
		w.treev.update()
		// we only allow deletion of unused pals
	}),
	"pal.edit": checkW((w, res) => {
		// lookup pal
		const p = w.d.pal.get(res.id)
		if (!p) return
		// update feature
		if (res.name && res.name != p.name) {
			p.name = res.name
			w.treev.update()
		}
		if (res.kind) p.kind = res.kind
		const fmod = res.del || res.feats?.length
		if (fmod) {
			applySlice(res, p.feats, res.feats)
			p.cache = undefined
		}
		// repaint pal view and img editor if active pal
		if (w.imgv?.pal.id == p.id) {
			const iv = w.imgv!
			iv.palv.update()
			if (fmod) iv.ed.repaint()
		}
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
		// clear color cache
		p.cache = undefined
		// repaint pal view and img editor if active pal
		if (w.imgv?.pal.id == p.id) {
			const iv = w.imgv!
			iv.palv.update()
			iv.ed.repaint()
		}
	}),
	"img.new": checkW((w, res:Img) => {
		// add img to world store
		w.d.img.set(res.id, res)
		// update tree view
		w.treev.update()
	}),
	"img.del": checkW((w, res) => {
		// delete img from world store
		w.d.img.set(res.id, null)
		w.treev.update()
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
		const modn = img.name != res.name
		Object.assign(img, res)
		if (modn) w.treev.update()
		// TODO update img view specifically pal view
	}),
	"clip.new": checkW((w, res:Clip) => {
		w.d.clip.set(res.id, res)
		w.treev.update()
	}),
	"clip.del": checkW((w, res) => {
		// delete clip from world store
		w.d.clip.set(res.id, null)
		w.treev.update()
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
		w.treev.update()
	}),
	"tset.del": checkW((w, res) => {
		// delete tset from world store
		w.d.tset.set(res.id, null)
		w.treev.update()
	}),
	"tset.edit": checkW((w, res) => {
		// lookup tset and edit
		const ts = w.d.tset.get(res.id)
		if (!ts) return
		const modn = ts.name != res.name
		Object.assign(ts, res)
		ts.cache = undefined
		if (modn) w.treev.update()
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
		w.treev.update()
	}),
	"lvl.del": checkW((w, res) => {
		// delete lvl from world store
		w.d.tset.set(res.id, null)
		w.treev.update()
		// TODO switch lvl if lvl is active in editor
	}),
	"lvl.open": checkW((w, res) => {
		w.lvlOpen(gridTiles<number>(res, res.raw) as Grid)
	}),
	"lvl.edit": checkW((w, res) => {
		// lookup lvl and edit
		const lv = w.d.lvl.get(res.id)
		if (!lv) return
		const modn = lv.name != res.name
		const modts = lv.tset != res.tset
		Object.assign(lv, res)
		if (modn) w.treev.update()
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
