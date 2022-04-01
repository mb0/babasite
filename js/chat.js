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
			h('header', 
				h('', 'babasite', h('sup', 'beta'), ' ', h('a', {href:'/logout'}, "Logout")),
				h('.menu', app.views.filter(v =>
					v != app.cur && v.name != 'lobby'
				).map(v =>
					h('', {onclick:e => {
						app.send("enter", {room:v.name})
					}}, v.label||v.name)
				)),
				h('h2', app.cur.label),
			),
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