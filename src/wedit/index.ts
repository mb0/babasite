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
import {WorldView, worldSel} from './view_world'
import {PicData} from './view_img'
import './wedit.css'

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
			h.repl(v.dock.main, h('', "Lädt Editor"))
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
			h.repl(v.dock.main, h('', "Lädt…"))
			app.send('world.open', {name:a.w})
			return
		}
		if (!a.top) {
			// show world overview
			h.repl(v.dock.main, h('', "Welt Übersicht"))
			return
		}
		// check active topic
		if (!a.id) {
			// show topic overview
			h.repl(v.dock.main, h('', "Topic Übersicht"))
			return
		}
		// check active game object
		if (!a.sub || !a.xtra) {
			// show topic detail
			const id = parseInt(a.id)
			if (a.top == 'lvl') {
				const lvl = v.w?.d.lvl.get(id)
				if (lvl) app.send('lvl.open', {id})
			} else if (a.top == 'img') {
				const img = v.w?.d.img.get(id)
				if (img) app.send('img.open', {id})
			} else {
				h.repl(v.dock.main, h('', "Topic Detail"))
			}
			return
		}
		// show sub or extra view
		h.repl(v.dock.main, h('', "Sub oder Extra Detail"))
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
	const checkW = (h:(w:WorldView, res:any, subj?:string)=>void):handler => (res, subj) => {
		if (res?.err) {
			console.error("error message: "+ subj, res.err)
			// TODO show alert dialog instead
		} else if (!v.w) {
			console.error("error message: "+ subj, "not subscribed")
		} else {
			h(v.w, res, subj)
		}
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
		let p = w.d.pal.get(res.id)
		if (!p) return
		if (!p.feats) p.feats = []
		// update feature
		let f = p.feats.find(f => f.name == res.feat)
		if (f) {
			if (f.colors) {
				let args:any = [res.idx||0, res.del||0]
				if (res.ins) args = args.concat(res.ins)
				f.colors.splice.apply(f.colors, args)
			} else {
				f.colors = res.ins
			}
		} else if (!res.idx && !res.del) {
			f = {name:res.feat, colors:res.ins||[]}
			p.feats.push(f)
		} else return
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
	}),
	"img.edit": checkW((w, res) => {
		// TODO lookup img and edit
		// repaint pal view and img editor
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
		// TODO lookup clip and edit
		// repaint pal view and img editor
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
		Object.assign(ts, res)
		if (w.lvlv?.tset.id == ts.id) {
			// TODO update lvl view
			// TODO if name change update treev
		}
	}),
	"tset.tile": checkW((w, res) => {
		// TODO lookup tset and edit tile
		const ts = w.d.tset.get(res.id)
		if (!ts) return
		let t = ts.infos.find(t => t.tile == res.tile)
		delete(res.id)
		if (!t) ts.infos.push(res as TileInfo)
		else Object.assign(t, res)
		if (w.lvlv?.tset.id == ts.id) {
			// TODO update lvl view
			// TODO if name change update treev
		}
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
		Object.assign(lv, res)
		if (w.lvlv?.lvl.id == lv.id) {
			// TODO update lvl view
			// TODO if name change update treev
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

type handler = (res:any,subj?:string)=>void
const checkErr = (h:handler):handler => (res, subj) => {
	if (res?.err) {
		console.error("error message: "+ subj, res.err)
		// TODO show alert dialog instead
	} else h(res, subj)
}

function growLevel(p:Grid, o:Box) {
	if (o.w*o.h<=0||boxIn(o, p)) return
	const b = boxGrow(p, o)
	const tmp = gridTiles<number>(b)
	gridEach(p, (p, t) => tmp.set(p, t))
	Object.assign(p, tmp)
}
