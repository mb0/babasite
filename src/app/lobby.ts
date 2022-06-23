import h from 'web/html'
import {View, menu} from 'app'

interface Lobby extends View {
	retry:number
}

const dots = '......'

export default {
	name: "lobby",
	retry: 0,
	start(app) {
		const el = h('#lobby-view', this.retry < 7 ?
			'Verbindet'+dots.slice(6-this.retry) :
			h('','Verbindung fehlgeschlagen ', h('span', {onclick: () => {
				this.retry = 0
				h.repl(el, 'Verbindet')
				app.connect()
			}}, 'Erneut versuchen')),
		)
		app.on(this.subs = {
			_open: () => {
				const {hash} = location
				if (hash?.length > 1) {
					let room = hash.slice(1)
					const idx = room.indexOf('/')
					if (idx >= 0) room = room.slice(0, idx)
					app.send("enter", {room})
				} else {
					h.repl(el, menu(),
						h('hr'),
						h('span', {onclick: ()=> location.href = '/baba_export.zip'}, "Export Data"),
					)
				}
			}
		})
		if (this.retry < 7) app.connect()
		return el
	},
	stop(app) {
		app.off(this.subs!)
	},
} as Lobby
