import h from 'web/html'
import {Conn, connect, wsUrl} from 'web/socket'

export interface View {
	name:string
	label?:string
	listen?:Listeners
	start(app:App):void
	stop():void
}
export type Listener = (data:any, subj:string)=>void
export type Listeners = {[key:string]:Listener}
export interface App {
	cur:View|null
	curlis:Listeners|void
	views:View[]
	cont:HTMLElement
	addOutput(text:string):void
	addView(view:View):View
	show(name:string):void
	start():void
	connect():void
	on(subj:string|Listeners, func?:Listener):void
	off(subj:string|Listeners, func?:Listener):void
	one(subj:string, func:Listener):void
	trigger(subj:string, data?:any):void
	send(subj:string, data?:any):void
}

let retry = 0
let conn:Conn|null = null
let listeners:{[key:string]:Listener[]} = {}
export let app:App = {
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
			app.off(c.listen||{})
		}
		app.cont.innerHTML = ''
		app.cur = v
		v.start(this)
		app.on(v.listen||{})
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
	on(subj, func) {
		if (typeof subj == "string") {
			let list = listeners[subj]
			if (!list) listeners[subj] = [func!]
			else list.push(func!)
		} else {
			Object.keys(subj).forEach(key => app.on(key, subj[key]))
		}
	},
	off(subj, func) {
		if (typeof subj == "string") {
			const list = listeners[subj]
			if (list) listeners[subj] = list.filter(f => f != func)
		} else {
			Object.keys(subj).forEach(key => app.off(key, subj[key]))
		}
	},
	one(subj, func) {
		const f = (data:any, subj:string) => {
			func(data, subj)
			app.off(subj, f)
		}
		app.on(subj, f)
	},
	trigger(subj, data) {
		const list = listeners[subj]
		if (list) list.forEach(f => f(data, subj))
	},
	send(subj, data) {
		if (!conn || conn.ws.readyState != WebSocket.OPEN) {
			console.log("not connected. trying to send:", subj, data)
		} else {
			conn.send(subj, data)
		}
	}
}

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
		this.listen = {
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
