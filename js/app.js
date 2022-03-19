let ws = null
let cur = null
let views = []
let listeners = {}
export let app = {
    cont: document.querySelector("#app"),
    addOutput(text) {
        console.log(text)
    },
    addView(view) {
        views.push(view)
        return view
    },
    show(name) {
        let v = views.find(v => v.name == name)
        if (!v) return
        if (cur) cur.stop()
        app.cont.innerHTML = ''
        v.start(this)
        cur = v
    },
    start() {
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
        let input = h('input#name', {type:"text",
            required:true, minlength:1, maxlength:16,
        })
        let form = h('form', 
            h('', h('label', {htmlFor:'name'}, "Name"), input),
            h('button', 'Enter'),
        )
        form.addEventListener('submit', function(e) {
            e.preventDefault()
            let name = input.value.trim()
            console.log("login as:", name)
            app.one("_open", () => app.send('enter', {room:'gol', name}))
            app.on('enter', (data) => app.show(data.room))
            app.connect()
        })
        app.cont.appendChild(h('#lobby-view', form))
    },
    stop(){}
})

export function h(name, args, data) {
    let idx = name.indexOf('#'), id
    if (idx>=0) {
        id = name.slice(idx+1)
        name = name.slice(0, idx)
    }
    let el = document.createElement(name||'div')
    if (id) el.id = id
    if (args && !addChild(el, args)) {
        Object.keys(args).forEach(key => {
            el[key] = args[key]
        })
    }
    Array.from(arguments).slice(2).forEach(d => {
        if (d) addChild(el, d)
    })
    return el
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
document.addEventListener("DOMContentLoaded", app.start)