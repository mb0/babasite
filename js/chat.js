let output = document.getElementById("output")
function addOutput(text) {
	let el = document.createElement("div")
	el.innerText = text
	output.appendChild(el)
	output.scrollTop = output.scrollHeight - output.clientHeight
}
let url = "ws://localhost:8080/hub"
let ws = new WebSocket(url)
ws.onopen = function(e) {
	addOutput("websocket connected to "+ url)
}
ws.onerror = function(e) {
	addOutput("websocket error: "+ e.message)
}
ws.onclose = function(e) {
	addOutput("websocket connection closed")
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
let listeners = {}
function addMsgListener(subj, listener) {
	let list = listeners[subj]
	if (list == null) {
		list = [listener]
		listeners[subj] = list 
	} else {
		list.push(listener)
	}
}

ws.onmessage = function(e) {
	let msg = parseMessage(e.data)
	let list = listeners[msg.subj]
	for (let i = 0; i<list.length; i++) {
		let listener = list[i]
		listener(msg)
	}
}
addMsgListener("chat", function(msg) {
	let obj = msg.data
	addOutput(obj.user +": "+ obj.msg)
})
let chat = document.getElementById("chat")
chat.onsubmit = function(e) {
	e.preventDefault()
	let input = chat[0]
	ws.send('chat\n'+JSON.stringify({msg:input.value}))
	input.value = ""
}

window.ws = ws
window.addOutput = addOutput
window.addMsgListener = addMsgListener