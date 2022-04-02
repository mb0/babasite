let ws = null
let listeners = {}
export let app = {
    cur: null,
    views: [],
    cont: document.querySelector("#app"),
    addOutput(text) {
        console.log(text)
    },
    addView(view) {
        this.views.push(view)
        return view
    },
    show(name) {
        let v = this.views.find(v => v.name == name)
        if (!v) return
        if (this.cur) this.cur.stop()
        app.cont.innerHTML = ''
        this.cur = v
        v.start(this)
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
        ws.onopen = function(e) {
            app.trigger('_open')
            app.addOutput("websocket connected to "+ url)
        }
        ws.onerror = function(e) {
            app.trigger('_error')
            app.addOutput("websocket error: "+ e.message)
        }
        ws.onclose = function(e) {
            app.trigger('_close')
            app.addOutput("websocket connection closed")
        }
        ws.onmessage = function(e) {
            let msg = parseMessage(e.data)
            console.log("got message "+msg.subj, msg.data)
            app.trigger(msg.subj, msg.data)
        }
    },
    on(subj, func) {
        if (typeof subj == "string") {
            let list = listeners[subj]
            if (!list) listeners[subj] = [func]
            else list.push(func)
        } else {
            Object.keys(subj).forEach(key => app.on(key, subj[key]))
        }
    },
    off(subj, func) {
        if (typeof subj == "string") {
            let list = listeners[subj]
            if (list) listeners[subj] = list.filter(f => f != func)
        } else {
            Object.keys(subj).forEach(key => app.off(key, subj[key]))
        }
    },
    one(subj, func) {
        let f = (data, subj) => {
            func(data, subj)
            app.off(subj, f)
        }
        app.on(subj, f)
    },
    trigger(subj, data) {
        let list = listeners[subj]
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
            if (location.hash && location.hash.length > 0) {
                app.send("enter", {room:location.hash.slice(1)})
            } else {
                hReplace(el, 
                    h('', 'babasite', h('sup', 'beta')),
                    h('.menu', app.views.filter(v =>
                        v != app.cur && v.name != 'lobby'
                    ).map(v =>
                        h('', {onclick:e => {
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

const selRegex = /^(\w+)?(?:#([^.]*))?(?:[.]([^ ]*))?$/
export function h(sel, args, data) {
    let m = sel.match(selRegex)
    if (!m) return undefined
    let el = document.createElement(m[1]||'div')
    if (m[2]) el.id = m[2]
    if (m[3]) el.className = m[3].replace('.', ' ')
    if (args && !addChild(el, args)) {
        Object.keys(args).forEach(key => {
            if (key == 'list' || key == 'for')
                el.setAttribute(key, args[key])
            else el[key] = args[key]
        })
    }
    addChild(el, Array.from(arguments).slice(2))
    return el
}
export function hAdd(el, args) {
    if (arguments.length > 2) args = Array.from(arguments).slice(1)
    return addChild(el, args)
}
export function hReplace(el, args) {
    el.innerHTML = ""
    if (arguments.length > 2) args = Array.from(arguments).slice(1)
    return addChild(el, args)
}

function addChild(el, data) {
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
function parseMessage(data) {
	let idx = data.indexOf('\n')
	if (idx < 0) {
		addOutput("empty message "+ data)
		return
	}
	let subj = data.slice(0, idx)
	let obj = JSON.parse(data.slice(idx+1))
	return {subj:subj, data:obj}
}
