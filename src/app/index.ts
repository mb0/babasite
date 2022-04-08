import h from 'web/html'
import {Conn, connect, wsUrl} from 'web/socket'
import {Hub, Subs, newHub} from 'app/hub'

export interface View {
	name:string
	label?:string
	subs?:Subs
	start(app:App):void
	stop():void
}
export interface App extends Hub {
	cur:View|null
	curlis:Subs|void
	views:View[]
	cont:HTMLElement
	addOutput(text:string):void
	addView(view:View):View
	show(name:string):void
	start():void
	connect():void
	send(subj:string, data?:any):void
}

let retry = 0
let conn:Conn|null = null
let hub = newHub()
export const app:App = {...hub,
	cur: null,
	curlis: undefined,
	views: [],
	cont: document.querySelector("#app")!,
	addOutput(text) {
		console.log(text)
	},
	addView(view) {
		app.views.push(view)
		return view
	},
	show(name) {
		const v = app.views.find(v => v.name == name)
		if (!v) return
		const c = app.cur
		if (c) {
			c.stop()
			app.off(c.subs||{})
		}
		app.cont.innerHTML = ''
		app.cur = v
		v.start(this)
		app.on(v.subs||{})
		if (v.name != 'lobby') location.hash = '#'+ v.name
	},
	start() {
		app.on({_close:() => {
			retry++
			app.show('lobby')
		}, enter:(data) => app.show(data.room)})
		app.show('lobby')
	},
	connect() {
		const url = wsUrl('/hub')
		conn = connect(url, (subj, data) => {
			switch (subj) {
			case '_open':
				retry = 0
				app.addOutput("websocket connected to "+ data)
				break
			case '_error':
				app.addOutput("websocket error: "+ data)
				break
			case '_close':
				app.addOutput("websocket connection closed")
			case '_msg':
			default:
				console.log("got message "+subj, data)
			}
			app.trigger(subj, data)
		})
	},
	send(subj, data) {
		if (!conn || conn.ws.readyState != WebSocket.OPEN) {
			console.log("not connected. trying to send:", subj, data)
		} else {
			conn.send(subj, data)
		}
	}
}

export default app

app.addView({
	name: "lobby",
	start(app) {
		const dots = '......'
		let el = h('#lobby-view', retry < 7 ? 'Verbindet'+dots.slice(6-retry): h('',
			'Verbindung fehlgeschlagen ', h('span', {onclick() {
				h.repl(el, 'Verbindet...')
				retry = 0
				app.connect()
			}}, 'Erneut versuchen'),
		))
		this.subs = {
			_open: () => {
				if (location.hash?.length > 0) {
					app.send("enter", {room:location.hash.slice(1)})
				} else {
					h.repl(el,
					    h('', 'babasite', h('sup', 'beta')),
					    h('.menu', app.views.filter(v =>
						v != app.cur && v.name != 'lobby'
					    ).map(v =>
						h('', {onclick:() => {
						    app.send("enter", {room:v.name})
						}}, v.label||v.name)
					    )),
					)
				}
			}
		}
		if (retry < 7) app.connect()
		h.add(app.cont, el)
	},
	stop(){}
})
