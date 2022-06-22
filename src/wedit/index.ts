import h from 'web/html'
import {newLayout, Layout} from 'game/dock'
import {gridTiles} from 'game/grid'
import {Clip, Img, Pal, Pic} from 'game/pix'
import {Grid, Lvl, Tset} from 'game/lvl'
import {View, app, chat, menu} from 'app'
import {Subs} from 'app/hub'
import {Slots, WorldData} from './world'
import {WorldView, worldSel} from './view_world'
import {PicData} from './view_img'
import './wedit.css'

export interface WeditView extends View {
	dock:Layout
	worlds:string[]
	w?:WorldView
	setWorld(wd?:WorldData):void
}

const v:WeditView = {name:"wedit", label:"World Editor",
	dock:newLayout("#wedit"),
	worlds:[],
	start(app) {
		app.on(v.subs = editorSubs(v))
		h.add(v.dock.head, h('', menu()))
		const chatel = chat.start(app)
		v.dock.add({label:'Chat', el:chatel, sel:'.dyn'})
		return v.dock.el
	},
	stop(app) {
		app.off(v.subs!)
		v.w = undefined
		h.repl(v.dock.head)
		v.dock.filter(() => false)
	},
	setWorld(wd?:WorldData) {
		if (wd) {
			v.w = new WorldView(wd, v.dock)
		} else {
			h.repl(v.dock.main, worldSel(v.worlds))
			v.w = undefined
		}
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
		const path = location.hash?.slice(1).split('/')
		if (path.length > 1) {
			h.repl(v.dock.main, h('', "Lädt…"))
			app.send("world.open", {name:path[1]})
		} else {
			v.setWorld()
		}
	}),
	"world.new": checkErr(res => {
		// update worlds list
		v.worlds.push(res.name)
		v.worlds.sort()
		// render worldSel if shown
		if (!v.w) v.setWorld()
	}),
	"world.del": checkErr(res => {
		// delete from worlds list
		v.worlds = v.worlds.filter(w => w == res.name)
		// exit editor if editing the world
		// render worldSel if show
		if (!v.w || v.w.d.name == res.name) v.setWorld()
	}),
	"world.open": checkErr(res => {
		const wd = res as WorldData
		wd.pal = new Slots(res.pal)
		wd.img = new Slots(res.img)
		wd.clip = new Slots(res.clip)
		wd.tset = new Slots(res.tset)
		wd.lvl = new Slots(res.lvl)
		v.setWorld(wd)
		const path = location.hash?.slice(1).split('/')
		switch (path[2]) {
		case "lvl":
			const lvl = wd.lvl.get(parseInt(path[3]))
			if (!lvl) break
			app.send('lvl.open', {id:lvl.id})
			return
		case "img":
			const img = wd.img.get(parseInt(path[3]))
			if (!img) break
			app.send('img.open', {id:img.id})
			return
		}
		location.hash = '#wedit/'+ res.name
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
		if (!p.feat) p.feat = []
		// update feature
		let f = p.feat.find(f => f.name == res.feat)
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
			p.feat.push(f)
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
		// repaint img editor if active pic
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
	"tile.edit": checkErr(res => {
		// TODO lookup tset and edit tile
		// repaint tset view and lvl editor if active tset
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
	"lvl.edit": checkW((w, res) => {
		// TODO lookup lvl and edit
		// repaint tset view and lvl editor if active lvl
	}),
	"lvl.open": checkW((w, res) => {
		w.lvlOpen(gridTiles<number>(res, res.raw) as Grid)
	}),
	"grid.edit": checkW((w, res) => {
		// TODO lookup and edit grid
		// repaint lvl editor if active grid
	}),
}}

type handler = (res:any,subj?:string)=>void
const checkErr = (h:handler):handler => (res, subj) => {
	if (res?.err) {
		console.error("error message: "+ subj, res.err)
		// TODO show alert dialog instead
	} else h(res, subj)
}
