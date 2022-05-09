import h from 'web/html'
import app from 'app'

export function menu() {
	return h('header.menu',
		h('b', app.cur?.label),
		h('span', 'babasite', h('sup', 'beta')),
		app.views.filter(v =>
			v != app.cur && v.name != 'lobby'
		).map(v =>
			h('span', {onclick: () => {
				app.send("enter", {room:v.name})
			}}, v.label||v.name)
		),
		h('span', {onclick: () => location.href = '/logout'}, "Logout"),
		h('style', `.menu span { display: inline-block; margin: .5em 2em }`),
	)
}
