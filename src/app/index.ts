import {Conn, connect, wsUrl} from 'web/socket'
import {Hub, Subs, newHub} from 'app/hub'
import lobby from 'app/lobby'

export interface View {
	name:string
	label?:string
	subs?:Subs
	start(app:App):void
	stop():void
}
export interface App extends Hub {
	cur:View|null
	views:View[]
	cont:HTMLElement
	addOutput(text:string):void
	addView(view:View):View
	show(name:string):void
	start():void
	connect():void
	send(subj:string, data?:any):void
}

let conn:Conn|null = null

export const app:App = {...newHub(),
	cur: null,
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
			lobby.retry++
			app.show('lobby')
		}, enter:(data) => app.show(data.room)})
		app.show('lobby')
	},
	connect() {
		const url = wsUrl('/hub')
		conn = connect(url, (subj, data) => {
			switch (subj) {
			case '_open':
				lobby.retry = 0
				app.addOutput("websocket connected to "+ data)
				break
			case '_error':
				app.addOutput("websocket error: "+ data)
				break
			case '_close':
				app.addOutput("websocket connection closed")
				break
			case '_msg':
				break
			default:
				// console.log("got message "+subj, data)
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

app.addView(lobby)

export default app

