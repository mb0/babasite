import app from "app"
import {h, HData} from "web/html"
import {topSlots, WorldData} from "./world"
import {mount, unmount} from 'web/modal'

interface TopView {
	name:string
	index?:(d:WorldData)=>HData
	detail?:(d:WorldData, id:number)=>HData
}

export const topViews:{[key:string]:TopView} = {
	img:  {name:'Asset'},
	pal:  {name:'Palette'},
	tset: {name:'Tileset'},
	lvl:  {name:'Level'},
	clip: {name:'Clip'},
}

export class TopicView {
	el=h('.topv')
	constructor(public d:WorldData, public top:string, public id?:number) {
		this.update()
	}
	update() {
		const {el, d, top, id} = this
		const v = topViews[top]
		if (!v) return
		h.repl(el, !id ? index(v, top)(d) : detail(v, top)(d, id))
	}
}

function index(v:TopView, top:string):(d:WorldData)=>HData {
	return v.index || ((d) => {
		const list = topSlots(d, top).all()
		return h('',
			h('h1', v.name + ' Übersicht'),
			list.map(t => h('', {onclick: (_) => {
				app.rr.go(app.rr.cur+'/'+t.id)
			}}, t.name||'(Ohne Namen)')),
		)
	})
}
function detail(v:TopView, top:string):(d:WorldData, id:number)=>HData {
	return v.detail || ((d, id) => {
		const o = topSlots(d, top).get(id)
		return h('',
			h('h1', v.name + ': '+ id),
			h('', (!o ? "nicht" : o.name || id) +" gefunden"),
			!o?null:h('button', {type:"button", onclick: (_)=> {
				mount(delForm(v.name +" "+ o.name, top, id))
			}}, v.name +" löschen"),
		)
	})
}

function delForm(title:string, top:string, id:number):HTMLElement {
	let onsubmit = (e:Event) => {
		e.preventDefault()
		app.send(top+".del", {id})
		unmount()
	}
	return h('.form',
		h('header', title+ (' löschen')),
		h('form', {onsubmit},
			h('', 'Möchtest du '+ title +" wirklich löschen?"),
			h('.btns', h('button', 'Ja, ganz sicher')),
		)
	)
}
