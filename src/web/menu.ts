import {h, hIcon} from 'web/html'
import './menu.css'

type MenuEl = MenuItem|MenuItem[]

export interface Menu {
	list:MenuEl[]
	act:(name:string)=>void
}

export interface MenuItem {
	name:string
	icon:string
	label?:string
}

export function renderMenu(m:Menu, opts?:any):HTMLElement {
	const renderEl = (el:MenuEl,d:number):HTMLElement => 'name' in el ?
		h('li', {title:el.label||el.name, 'data-el':el.name},
			hIcon(el.icon, {}),
			d > 0 ? h('span', el.name) : null
		) : h('li.drop',
			hIcon('opts', {}),
			h('menu.drop', el.map(el => renderEl(el, 1)))
		)
	return h('menu', Object.assign(opts||{}, {onclick: (e:any) => {
		e.preventDefault()
		const name = e.target.closest('li')?.dataset.el
		if (name) m.act(name)
	}}), m.list.map(el => renderEl(el, 0)))
}
