import app from "app"
import {h, HData, hIcon} from "web/html"
import {topSlots, WorldData} from "./world"
import {mount, unmount} from 'web/modal'
import {lvlForm} from "./view_lvl"
import {imgForm} from "./view_img"
import {palForm} from "./view_pal"
import {tsetForm} from "./view_tset"

interface TopView {
	name:string
	index?:(d:WorldData)=>HData
	detail?:(d:WorldData, id:number)=>HData
	form?:Function
}

export const topViews:{[key:string]:TopView} = {
	img:  {name:'Asset', form: imgForm},
	pal:  {name:'Palette', form: palForm},
	tset: {name:'Tileset', form: tsetForm},
	lvl:  {name:'Level', form: lvlForm},
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
			list.map(t => indexEntry(v, d, top, t)),
		)
	})
}

function indexEntry(v:TopView, d:WorldData, top:string, t:any):HData {
	const name = t.name || '(Ohne Namen)'
	return h('', {style: 'display:flex'},
		h('span', {style: 'min-width: 140px', onclick: (_) => {
			app.rr.go(app.rr.cur+'/'+t.id)
		}}, name),
		!v.form?null:h('a', {title: v.name +" "+ name +" ändern", onclick: (e:Event)=> {
			e.preventDefault()
			mount(v.form!(d, t, (res:any) => {
				app.send(top+".edit", res)
				unmount()
			}))
		}}, hIcon('gear', {})),
		h('a', {title: v.name +" "+ name +" löschen", onclick: (e:Event)=> {
			e.preventDefault()
			mount(delForm(v.name +" "+ name, top, t.id))
		}}, hIcon('close', {})),
	)
}

function detail(v:TopView, top:string):(d:WorldData, id:number)=>HData {
	return v.detail || ((d, id) => {
		const o = topSlots(d, top).get(id)
		return h('',
			h('h1', v.name + ': '+ id),
			h('', (!o ? "nicht" : o.name || id) +" gefunden"),
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
