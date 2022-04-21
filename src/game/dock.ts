import {h, HData} from 'web/html'

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

export interface Dock {
	el:HTMLElement
	label:string
}

export interface Layout {
	el:HTMLElement
	head:HTMLElement
	main:HTMLElement
	docks:Dock[]
	add(d:Dock, at?:number):void
	del(d:Dock):void
}

export function newLayout(sel?:string, header?:HData, body?:HData):Layout {
	const cont = h('.docks')
	const head = h('.dock-head', header||null)
	const main = h('.dock-main', body||null)
	const el = h((sel||'')+'.dock-layout',
		h('style', dockCss), head,
		h('.dock-cont', cont, main),
	)
	return {el, head, main, docks:[],
		add(d, at) {
			const {docks} = this
			const idx = at === undefined ? docks.length : at
			if (idx < 0) return
			docks.splice(idx, 0, d)
			h.repl(cont, docks.map(d => d.el))
		},
		del(d) {
			const {docks} = this
			const idx = docks.indexOf(d)
			if (idx < 0) return
			docks.splice(idx, 1)
			h.repl(cont, docks.map(d => d.el))
		},
	}
}

const dockCss = `
.dock-layout {
	width: 100vw;
	height: 100vh;
	display: flex;
	flex-direction: column;
}
.dock-cont {
	flex:1 1 0;
	display: flex;
	overflow-y: hidden;
}
.dock-main {
	flex:1 1 0;
	display: flex;
	position: relative;
}
.dock-main > canvas {
	display:block;
	max-width: 100%;
	max-height: 100%;
	flex: 1 1 0;
}
.docks {
	display: flex;
	flex-direction: column;
	flex: 0 0 auto;
}
.docks > * {
	flex: 0 0 auto;
}
.docks #chat-view {
	flex: 1 1 auto;
}
`
