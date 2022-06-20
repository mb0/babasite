import h from 'web/html'
import {newLayout, Layout} from 'game/dock'
import {gridTiles} from 'game/grid'
import {Clip, Img, Pal, Pic} from 'game/pix'
import {Grid, Lvl, Tset} from 'game/lvl'
import {View, app, chat, menu} from 'app'
import {Subs} from 'app/hub'
import {WorldData} from './world'
import {WorldView, worldSel} from './view_world'
import {PicData} from './view_img'

export interface WeditView extends View {
	dock:Layout
	worlds:string[]
	w?:WorldView
	setWorld(w?:WorldData):void
}

const v:WeditView = {name:"wedit", label:"World Editor",
	dock:newLayout("#wedit"),
	worlds:[],
	start(app) {
		app.on(v.subs = editorSubs(v))
		const d = v.dock
		h.add(d.head, h('', menu()))
		h.add(d.el, h('style', style))
		const chatel = chat.start(app)
		d.add({label:'Chat', el:chatel, sel:'.dyn'})
		return d.el
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
		if (!v.w || v.w.data.name == res.name) v.setWorld()
	}),
	"world.open": checkErr(res => {
		v.setWorld(res as WorldData)
		const path = location.hash?.slice(1).split('/')
		if (path[0] != "wedit" || path[1] != res.name) {
			location.hash = '#wedit/'+ res.name
			return
		}
		// TODO open specific view
		switch (path[2]) {
		case "grid":
		case "clip":
		}
	}),
	"pal.new": checkW(({data}, res:Pal) => {
		// add pal to world store
		data.pal.push(res)
		// TODO update wtree
	}),
	"pal.del": checkW(({data}, res) => {
		// delete pal from world store
		const idx = data.pal.findIndex(p => p.id == res.id)
		if (idx < 0) return
		data.pal.splice(idx, 1)
	}),
	"pal.edit": checkW(({data}, res) => {
		// lookup pal and edit feature
		let p = data.pal.find(p => p.id == res.id)
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
		} else {
			return
		}
		p.cache = undefined
		// TODO repaint pal view and img editor if active pal
	}),
	"img.new": checkW(({data}, res:Img) => {
		// add img to world store
		data.img.push(res)
		// TODO update wtree
	}),
	"img.del": checkW(({data}, res) => {
		// delete img from world store
		const idx = data.img.findIndex(o => o.id == res.id)
		if (idx < 0) return
		data.img.splice(idx, 1)
	}),
	"img.open": checkW((w, res:PicData) => {
		// open clip editor
		res.pics = res.pics.map(pic => gridTiles<number>(pic, pic.raw) as Pic)
		w.imgOpen(res)
	}),
	"img.edit": checkW((w, res) => {
		// lookup img and edit
		// repaint pal view and img editor
	}),
	"clip.new": checkW(({data}, res:Clip) => {
		data.clip.push(res)
		// TODO update wtree
	}),
	"clip.del": checkW((w, res) => {
		// delete clip from world store
	}),
	"clip.edit": checkW((w, res) => {
		// lookup img and edit
		// repaint pal view and img editor
	}),
	"pic.edit": checkW((w, res) => {
		// lookup pic and edit
		// repaint img editor if active pic
	}),
	"tset.new": checkW(({data}, res:Tset) => {
		data.tset.push(res)
		// TODO update wtree
	}),
	"tset.del": checkErr(res => {
		// delete tset from world store
		// think about whether to allow cascading delete or only allow dangling deletes
	}),
	"tile.edit": checkErr(res => {
		// lookup tset and edit tile
		// repaint tset view and lvl editor if active tset
	}),
	"lvl.new": checkW(({data}, res:Lvl) => {
		data.lvl.push(res)
		// TODO update wtree
	}),
	"lvl.del": checkErr(res => {
		// delete lvl from world store
		// switch lvl if lvl is active in editor
	}),
	"lvl.edit": checkErr(res => {
		// lookup lvl and edit
		// repaint tset view and lvl editor if active lvl
	}),
	"grid.open": checkErr(res => {
		v.w?.gridOpen(gridTiles<number>(res, res.raw) as Grid)
	}),
	"grid.edit": checkErr(res => {
		// lookup and edit grid
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


const style = `
.wtree {
	max-height: 40vh;
	overflow-y: auto;
	padding: 4px 0 4px 1em;
	margin: 0;
}
.wtree ul {
	padding-left: 1em;
}
.wtree li {
	list-style-position: inside;
}
.wtree li.sum {
	list-style: none;
}
#img-view {
	flex: 1 1 0;
	display: flex;
	flex-direction: column;
	align-items: stretch;
}
#img-view #editor-canvas {
	flex: 1 1 auto;
}
.color {
	display: flex;
	align-content: center;
}
.color label {
	min-width: 4em;
}
.color span {
	width:1.4em;
	height:1.4em;
}
.color div {
	margin-left: 4px;
}
`