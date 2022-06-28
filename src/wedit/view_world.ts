import h from 'web/html'
import {Menu} from 'web/menu'
import {Dock, Layout} from 'game/dock'
import app from 'app'
import {Img} from 'game/pix'
import {Grid} from 'game/lvl'
import {WorldData, namedTables} from './world'
import {LvlView} from './view_lvl'
import {ImgView, PicData} from './view_img'
import {nameInput, simpleForm} from './form'

export function worldSel(worlds:string[]):HTMLElement {
	return h('', "Welt auswählen", h('ul', worlds.map(w =>
		h('li', {onclick: ()=>app.rr.go("/wedit/"+w)}, w)
	)))
}

export class WorldView {
	treev:WorldTree
	lvlv?:LvlView
	imgv?:ImgView
	constructor(readonly d:WorldData, readonly dock:Layout) {
		dock.add(this.treev = new WorldTree(this), 0)
		h.repl(dock.main, "")
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

type TopClick = (top:string, el:any)=>void

class WorldTree implements Dock {
	el = h('ul.wtree')
	label:string
	group = "wedit"
	cont?:HTMLElement
	menu:Menu
	constructor(public w:WorldView) {
		this.label = "World "+ w.d.name
		this.menu = {act:it=>console.log('menu', it), list:[
			{name:'world.sel', icon:'swap', label:'Welt auswählen'},
		]}
		this.update()
	}
	update():void {
		const w = this.w
		const click = (top:string, el:any) => {
			console.log("open "+ top, el)
			if (top == 'clip') {
				app.rr.go(`/wedit/${w.d.name}/img/${el.img}/${el.id}`)
			} else {
				app.rr.go(`/wedit/${w.d.name}/${top}/${el.id}`)
			}
		}
		h.repl(this.el, namedTables.map(({top, label}) => {
			if (top == "clip") return null
			const sub = top == "img" ? imgTree(w.d, click) :
				tableTree((w.d as any)[top], top, click)
			const open = top == "lvl" || top == "img"
			return h('li.sum', h('details', {open}, h('summary', label), sub))
		}))
	}
}

function tableTree(list:any[], top:string, click:TopClick):HTMLElement {
	return h('ul', list.map((el:any) => {
		return h('li', {onclick: () => click(top, el)}, el.name || '(Ohne Namen)')
	}))
}

function imgTree(d:WorldData, click:TopClick):HTMLElement {
	return h('ul', d.img.fmap((img:Img) => {
		const clips = d.clip.all(c => c.img == img.id)
		const onctx = (e:any) => {
			e.preventDefault()
			click("img", img)
		}
		return h('li.sum',
			h('details', h('summary', {oncontextmenu: onctx}, img.name || '(Ohne Namen)'),
				tableTree(clips, "clip", click)
			),
		)
	}))
}

interface WorldInfo {
	name:string
}

export function worldForm(s:Partial<WorldInfo>, isnew:boolean, submit:(res:Partial<WorldInfo>)=>void) {
	return simpleForm<WorldInfo>('World', s, isnew, submit, [
		nameInput(s.name),
	])
}
