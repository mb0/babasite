import {h} from 'web/html'
import {Conn, connect, wsUrl} from 'web/socket'
import {Hub, Subs} from 'app/hub'
import lobby from 'app/lobby'
import {selMenu} from 'app/menu'
export {chat} from 'app/chat'
export {menu} from 'app/menu'

export interface View {
	name:string
	label?:string
	subs?:Subs
	start(app:App):HTMLElement
	stop(app:App):void
}
export class App extends Hub {
	cont:HTMLElement=document.querySelector("#app")!
	views:View[]=[]
	cur?:View
	conn?:Conn
	constructor() {
		super()
		this.addView(lobby)
	}
	addView(view:View):View {
		this.views.push(view)
		return view
	}
	show(name:string):void {
		const app = this
		const v = app.views.find(v => v.name == name)
		if (!v) return
		if (app.cur) app.cur.stop(app)
		app.cur = v
		h.repl(app.cont, v.start(this))
		if (v.name != 'lobby') {
			selMenu(app.cont, v.name)
			const hash = '#'+ v.name
			if (location.hash.indexOf(hash) != 0)
				location.hash = hash
		}
	}
	start():void {
		this.on({_close:() => {
			lobby.retry++
			this.show('lobby')
		}, enter:(data) => this.show(data.room)})
		this.show('lobby')
	}
	connect():void {
		this.conn = connect(wsUrl('/hub'), (subj, data) => {
			switch (subj) {
			case '_open':
				lobby.retry = 0
				console.log("websocket connected to "+ data)
				break
			case '_error':
				console.log("websocket error", data)
				break
			case '_close':
				console.log("websocket connection closed")
				break
			case '_msg':
				break
			default:
				// console.log("got message "+subj, data)
			}
			this.trigger(subj, data)
		})
	}
	send(subj:string, data?:any):void {
		if (this.conn?.ws.readyState != WebSocket.OPEN) {
			console.log("not connected. trying to send:", subj, data)
		} else {
			// console.log("send message "+subj, data)
			this.conn.send(subj, data)
		}
	}
}

export const app = new App()

export default app

