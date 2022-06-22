import {h, HData} from 'web/html'
import {Menu, renderMenu} from 'web/menu'
import './dock.css'

/*
we want a responsive page layout primarily for editors and maybe for games.
where the most part of the screen is filled with the main view (usually a canvas) and a
dock container positioned around the main view depending on the display size and orientation.

a dock container contains multiple dock views that can be added, deleted or reordered.
each dock view has a title and some contents and can be minimized or hidden.

desktop layout can show multiple maximized dock views in a dock container.
on a smaller screen in landscape mode we show only one dock maximized.
on a small screen in portrait mode we add a menu and use model popups for docks.
*/

export abstract class BaseDock implements Dock {
	el:HTMLElement
	label?:string
	group?:string
	sel?:string
	head?:HTMLElement
	cont?:HTMLElement
	menu?:Menu
	constructor(sel:string) { this.el = h(sel) }
}

export interface Dock {
	el:HTMLElement
	label?:string
	group?:string
	head?:HTMLElement
	cont?:HTMLElement
	sel?:string
	menu?:Menu
}

export interface Layout {
	el:HTMLElement
	head:HTMLElement
	main:HTMLElement
	docks:Dock[]
	add(d:Dock, at?:number):void
	del(d:Dock):void
	filter(f:(d:Dock)=>boolean):void
}

export function newLayout(sel?:string, header?:HData, body?:HData):Layout {
	const cont = h('.docks')
	const head = h('.dock-head', header||null)
	const main = h('.dock-main', body||null)
	const el = h((sel||'')+'.dock-layout', head,
		h('.dock-cont', cont, main),
	)
	return {el, head, main, docks:[],
		add(d, at) {
			const {docks} = this
			const idx = at === undefined ? docks.length : at
			if (idx < 0) return
			if (!d.cont) {
				const sel = 'details.dock'+(d.sel||'')
				const menu = d.menu && renderMenu(d.menu)
				d.cont = h(sel, {open:true}, h('summary', d.head||d.label, menu||null), d.el)
			}
			docks.splice(idx, 0, d)
			h.repl(cont, docks.map(d => d.cont!))
		},
		del(d) {
			const {docks} = this
			const idx = docks.indexOf(d)
			if (idx < 0) return
			docks.splice(idx, 1)
			h.repl(cont, docks.map(d => d.cont!))
		},
		filter(f:(d:Dock)=>boolean) {
			this.docks = this.docks.filter(f)
			h.repl(cont, this.docks.map(d => d.cont!))
		},
	}
}
