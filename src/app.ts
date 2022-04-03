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

let ws:WebSocket|null = null
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
		app.on('_close', () => app.show('lobby'))
		app.show('lobby')
	},
	connect() {
		let url = location.protocol + "//" + location.host + '/hub'
		if (url.startsWith("http")) {
			url = "ws" + url.slice(4)
		}
		ws = new WebSocket(url)
		ws.onopen = () => {
			app.trigger('_open')
			app.addOutput("websocket connected to "+ url)
		}
		ws.onerror = (e:Event) => {
			app.trigger('_error')
			app.addOutput("websocket error: "+ e)
		}
		ws.onclose = () => {
			app.trigger('_close')
			app.addOutput("websocket connection closed")
		}
		ws.onmessage = (e:MessageEvent) => {
			const msg = parseMessage(e.data)
			console.log("got message "+msg.subj, msg.data)
			app.trigger(msg.subj, msg.data)
		}
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
		if (!ws) {
			console.log("send but not connected", subj, data)
			return
		}
		let raw = subj
		if (data !== undefined) raw += '\n'+JSON.stringify(data)
		ws.send(raw)
	}
}

app.addView({
	name: "lobby",
	start(app) {
		let el = h('#lobby-view', 'Verbindet...')
		app.on('enter', (data) => app.show(data.room))
		app.one("_open", () => {
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
		})
		app.connect()
		app.cont.appendChild(el)
	},
	stop(){}
})

export type HArg = {[key:string]:any}
export type HData = HTMLElement|string|HData[]|null

const selRegex = /^(\w+)?(?:#([^.]*))?(?:[.]([^ ]*))?$/
export function h(sel:string, args?:HArg|HData, ...data:HData[]):HTMLElement {
	let m = sel.match(selRegex)
	if (!m) throw new Error("invalid selector: "+sel)
	let el = document.createElement(m[1]||'div')
	if (m[2]) el.id = m[2]
	if (m[3]) el.className = m[3].replace('.', ' ')
	if (args && !addChild(el, args)) {
		Object.keys(args).forEach(key => {
			if (key == 'list' || key == 'for')
				el.setAttribute(key, args[key])
			else (el as any)[key] = args[key]
		})
	}
	if (data) addChild(el, data)
	return el
}
h.add = (el:HTMLElement, ...data:HData[]) => addChild(el, data)
h.repl = (el:HTMLElement, ...data:HData[]) => {
	el.innerHTML = ""
	return addChild(el, data)
}

function addChild(el:HTMLElement, data:HArg|HData):data is HData {
	if (typeof data == "string") {
		el.appendChild(document.createTextNode(data))
	} else if (Array.isArray(data)) {
		data.forEach(d => {
			addChild(el, d)
		})
	} else if (data instanceof HTMLElement) {
		el.appendChild(data)
	} else {
		return false
	}
	return true
}

export interface Msg {
	subj:string
	data:any
}
function parseMessage(raw:string):Msg {
	let idx = raw.indexOf('\n')
	if (idx < 0) {
		return {subj:raw, data:null}
	}
	let subj = raw.slice(0, idx)
	let data = JSON.parse(raw.slice(idx+1))
	return {subj, data}
}
