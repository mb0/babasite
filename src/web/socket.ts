export interface Conn {
	ws:WebSocket
	send(subj:string, data?:any):void
}

export function connect(url:string, hand:(subj:string, data?:any)=>void):Conn {
	const ws = new WebSocket(url)
	ws.onopen = () => hand('_open', url)
	ws.onerror = (e:Event) => hand('_error', e)
	ws.onclose = () => hand('_close', url)
	ws.onmessage = (e:MessageEvent) => {
		const msg = parseMessage(e.data)
		hand("_msg", msg)
		hand(msg.subj, msg.data)
	}
	return {ws, send(subj, data) {
		let raw = subj
		if (data !== undefined) raw += '\n'+JSON.stringify(data)
		ws.send(raw)
	}}
}

export function wsUrl(path:string):string {
	if (path&&path[0] != '/') path = '/'+path
	let url = location.protocol + "//" + location.host + path
	if (url.startsWith("http")) {
		url = "ws" + url.slice(4)
	}
	return url
}

export interface Msg {
	subj:string
	data:any
}

export function parseMessage(raw:string):Msg {
	let idx = raw.indexOf('\n')
	if (idx < 0) {
		return {subj:raw, data:null}
	}
	let subj = raw.slice(0, idx)
	let data = JSON.parse(raw.slice(idx+1))
	return {subj, data}
}
