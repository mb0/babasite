import h from 'web/html'
import app from 'app'

export function menu() {
	return h('header.menu',
		h('span', {onclick: ()=> location.href = '/'}, 'babasite', h('sup', 'beta')),
		app.views.map(v => v.name == 'lobby' ? null :
			h('span', {'data-room':v.name, onclick: () => {
				app.send("enter", {room:v.name})
			}}, v.label||v.name)
		),
		h('span', {onclick: () => location.href = '/logout'}, "Logout"),
	)
}

export function selMenu(el:HTMLElement, room:string) {
	const spans = el.querySelectorAll('span[data-room]')
	spans.forEach(el => {
		const s = el as HTMLElement
		s.className = s.dataset.room == room ? 'sel' : ''
	})
}
