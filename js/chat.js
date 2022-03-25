import {app, h} from './app.js'

let listeners = {
	chat: data => {
		addOutput(data.user +": "+ data.msg)
	},
	hist: data => {
		if (data.msgs) data.msgs.forEach(el => 
			output.appendChild(h('', el.user +": "+ el.msg))
		)
		scrollEnd()
	}
}
export let chat = {
	name: "chat",
	start: function(app) {
		let input = h('input', {name:'chat', type:'text', placeholder:'Chat', autocomplete:'off'})
		let form = h('form#chat', input, h('button', 'Send'))
		form.onsubmit = function(e) {
			e.preventDefault()
			app.send('chat', {msg:input.value})
			input.value = ""
		}
		app.cont.appendChild(h('#chat-view',
			h('h1', 'Chat'),
			output, form,
		))
		app.on(listeners)
	},
	stop: function() {
		app.off(listeners)
		output.innerHTML = ""
	}
}

let output = h('code#output')
function addOutput(text) {
	output.appendChild(h('', text))
	scrollEnd()
}
function scrollEnd() {
	output.scrollTop = output.scrollHeight - output.clientHeight
}
app.addOutput = addOutput