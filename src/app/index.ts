import {h} from 'web/html'
import {Conn, connect, wsUrl} from 'web/socket'
import {Hub, Subs} from 'app/hub'
import {Router, Routes} from 'app/router'
import {selMenu} from 'app/menu'
import lobby from 'app/lobby'
import snack from 'web/snack'
export {chat} from 'app/chat'
export {menu} from 'app/menu'

const debug = true

export interface View {
	name:string
	label?:string
	subs?:Subs
	routes?:Routes
	start():HTMLElement
	stop():void
}

export class App extends Hub {
	cont:HTMLElement=document.querySelector("#app")!
	rr:Router
	views:View[]=[]
	cur?:View
	conn?:Conn
	constructor() {
		super()
		this.rr = new Router('/')
		this.addView(lobby)
	}
	addView(view:View):View {
		this.views.push(view)
		if (!view.routes) this.rr.add('/'+view.name, ()=> this.send('enter', {room:view.name}))
		else Object.keys(view.routes).forEach(pat => {
			this.rr.add(pat, view.routes![pat])
		})
		return view
	}
	show(name:string):void {
		const v = this.views.find(v => v.name == name)
		if (!v) return
		if (this.cur) this.cur.stop()
		this.cur = v
		h.repl(this.cont, v.start())
		if (v.name != 'lobby') {
			selMenu(this.cont, v.name)
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
				if (debug) console.log("websocket connected", data)
				this.rr.start(true)
				break
			case '_error':
				if (debug) console.log("websocket error", data)
				break
			case '_close':
				if (debug) console.log("websocket closed")
				break
			case '_msg':
				break
			default:
				if (debug) console.log("got message: "+subj, data)
			}
			this.trigger(subj, data)
		})
	}
	send(subj:string, data?:any):void {
		if (this.conn?.ws.readyState != WebSocket.OPEN) {
			if (debug) console.error("not connected. trying to send: "+subj, data)
			snack.act("Nicht verbunden", 5000, "Erneut verbinden", ()=> location.reload())
		} else {
			if (debug) console.log("send message "+subj, data)
			this.conn.send(subj, data)
		}
	}
}

export const app = new App()

export default app

