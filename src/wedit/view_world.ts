import h from 'web/html'
import {Layout} from 'game/dock'
import app from 'app'
import {Img} from 'game/pix'
import {Grid} from 'game/lvl'
import {WorldData, namedTables} from './world'
import {GridView} from './view_grid'
import {ImgView, PicData} from './view_img'
import {nameInput, simpleForm} from './form'

export function worldSel(worlds:string[]):HTMLElement {
	return h('', "Welt auswählen", h('ul', worlds.map(w => h('li', {onclick: () => {
		app.send("world.open", {name:w})
	}}, w))))
}

export class WorldView {
	gridv?:GridView
	imgv?:ImgView
	constructor(readonly data:WorldData, readonly dock:Layout) {
		const click = (top:string, el:any) => {
			console.log("open "+ top, el)
			if (top == "lvl") app.send("grid.open", {id:el.grid})
			if (top == "img") app.send("img.open", {id:el.id})
		}
		dock.add({label:'World '+ data.name, el:worldTree(data, click), group:"wedit"}, 0)
		h.repl(dock.main, "")
	}
	gridOpen(g:Grid):void {
		const {data, dock} = this
		if (data.grid) {
			// TODO clean up old editor
		}
		data.grid = g
		dock.filter(({group}) => !group || group == "wedit")
		this.gridv = new GridView(data, dock)
	}
	imgOpen(pd:PicData):void {
		const {data, dock} = this
		// TODO clean up old state
		if (!data.pics) data.pics = new Map()
		pd.pics.forEach(p => data.pics!.set(p.id, p))
		dock.filter(({group}) => !group || group == "wedit")
		this.imgv = new ImgView(data, dock, pd.id)
	}
}

type TopClick = (top:string, el:any)=>void
function worldTree(data:WorldData, click:TopClick):HTMLElement {
	return h('ul.wtree', namedTables.map(({top, label}) => {
		if (top == "clip") return
		const el = top == "img" ? imgTree(data, click) :
			tableTree((data as any)[top], top, click)
		const open = top == "lvl" || top == "img"
		return h('li.sum', h('details', {open}, h('summary', label), el))
	}))
}

function tableTree(list:any[], top:string, click:TopClick):HTMLElement {
	return h('ul', list.map((el:any) => {
		return h('li', {onclick: () => click(top, el)}, el.name || '(Ohne Namen)')
	}))
}

function imgTree(data:WorldData, click:TopClick):HTMLElement {
	return h('ul', data.img.map((img:Img) => {
		const clips = data.clip.filter(c => c.img == img.id)
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
