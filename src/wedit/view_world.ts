import h from 'web/html'
import {Menu} from 'web/menu'
import {Dock, Layout} from 'game/dock'
import app from 'app'
import {Grid} from 'game/lvl'
import {WorldData, namedTables} from './world'
import {LvlView} from './view_lvl'
import {ImgView, PicData} from './view_img'
import {TopicView} from './view_top'

export function worldSel(worlds:string[]):HTMLElement {
	return h('', "Welt auswählen", h('ul', worlds.map(w =>
		h('li', {onclick: ()=>app.rr.go("/wedit/"+w)}, w)
	)))
}

export class WorldView {
	treev:TreeView
	lvlv?:LvlView
	imgv?:ImgView
	topv?:TopicView
	constructor(readonly d:WorldData, readonly dock:Layout) {
		dock.add(this.treev = new TreeView(d), 0)
		h.repl(dock.main, "")
	}
	topOpen(top:string, id?:number):void {
		this.clean()
		this.topv = new TopicView(this.d, top, id)
	}
	lvlOpen(g:Grid):void {
		const {d, dock} = this
		this.clean()
		d.grid = g
		this.lvlv = new LvlView(d, dock)
	}
	imgOpen(pd:PicData):void {
		const {d, dock} = this
		this.clean()
		pd.pics.forEach(p => d.pics.set(p.id, p))
		this.imgv = new ImgView(d, dock, pd.id)
	}
	stop() {
		this.clean()
		this.dock.filter(({group}) => !group)
	}
	clean() {
		this.dock.filter(({group}) => !group || (group == "wedit"))
		this.topv = undefined
		if (this.lvlv) {
			this.lvlv.close()
			this.lvlv = undefined
		}
		if (this.imgv) {
			this.imgv.close()
			this.imgv = undefined
		}
	}
}

export function worldIndex(d:WorldData) {
	return h('.windex', h('h1', "World "+ d.name))
}

type TopAct = (top:string, el?:any)=>void

class TreeView implements Dock {
	el = h('ul.wtree')
	label:string
	group = "wedit"
	cont?:HTMLElement
	menu:Menu
	act:TopAct
	open:{[key:string]:boolean}
	constructor(public d:WorldData) {
		this.label = "World "+ d.name
		// TODO maybe save tree toggle state in local storage
		this.open = {lvl:true, img:true}
		this.act = (top:string, el?:any) => {
			if (top == "world.sel") {
				app.rr.go("/wedit")
			} else if (top.indexOf('.') < 0) {
				app.rr.go(`/wedit/${d.name}/${top}/${el.id}`)
			} else {
				console.log(`action ${top} not implemented`)
			}
		}
		this.menu = {act:this.act, list:[
			{name:'world.sel', icon:'swap', label:'Welt auswählen'},
		]}
		this.update()
	}
	update():void {
		const {open} = this
		h.repl(this.el, namedTables.map(({top, label}) => {
			if (top == "clip") return null
			const sub = this.topicSub(top)
			const link = h('a', {title:label+' Übersicht', onclick: (e:Event) => {
				e.preventDefault()
				app.rr.go("/wedit/"+this.d.name+"/"+top)
			}}, label)
			if (!sub) return h('li', link)
			return h('li.sum', h('details', {open:open[top], ontoggle: (e:any) =>{
				open[top] = e.target.open
			}}, h('summary', link), sub))
		}))
	}
	topicSub(top:string):HTMLElement|null {
		if (top != "lvl" && top != "img") return null
		const {d, act} = this
		return tableTree((d as any)[top].all(), top, act)
	}
}


function tableTree(list:any[], top:string, act:TopAct):HTMLElement {
	return h('ul', list.map((el:any) => {
		return h('li', {onclick: () => act(top, el)}, el.name || '(Ohne Namen)')
	}))
}
