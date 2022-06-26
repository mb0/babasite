import h from 'web/html'
import app from 'app'

export function menu() {
	const {rr} = app
	return h('header.menu',
		rr.link('/', h('span', 'babasite', h('sup', 'beta'))),
		app.views.map(v => v.name == 'lobby' ? null :
			rr.link('/'+v.name, v.label||v.name, {'data-room':v.name})
		),
	)
}

export function selMenu(el:HTMLElement, room:string) {
	const spans = el.querySelectorAll('a[data-room]')
	spans.forEach(el => {
		const s = el as HTMLElement
		s.className = s.dataset.room == room ? 'sel' : ''
	})
}
