import h from 'web/html'
import {app, View, menu} from 'app'

interface Lobby extends View {
	el:HTMLElement
	retry:number
}

const dots = '......'

export default {
	el: h('#lobby-view'),
	name: "lobby",
	retry: 0,
	routes: {'/': ()=> app.cur?.name != 'lobby' && app.show('lobby')},
	start() {
		const stat = app.conn?.ws.readyState
		if (stat && stat >= WebSocket.OPEN) {
			h.repl(this.el, menu(),
				h('hr'),
				h('span', {onclick: ()=> location.href = '/baba_export.zip'}, "Export Data"),
			)
		} else {
			h.repl(this.el, this.retry < 7 ? 'Verbindet'+dots.slice(6-this.retry) :
				h('','Verbindung fehlgeschlagen ', h('span', {onclick: () => {
					this.retry = 0
					h.repl(this.el, 'Verbindet')
					app.connect()
				}}, 'Erneut versuchen')),
			)
			app.on(this.subs = {_open: () => this.start()})
			if (this.retry < 7) app.connect()
		}
		return this.el
	},
	stop() {
		if (this.subs) app.off(this.subs)
	},
} as Lobby
