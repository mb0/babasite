import {app, h, App, View} from './app'

export interface ChatData {
	user:string
	msg:string
}

export const chat:View = {
	name: "chat",
	start: function(app:App) {
		const input = h('input', {name:'chat', type:'text', placeholder:'Chat', autocomplete:'off'}) as HTMLInputElement
		const form = h('form#chat', input, h('button', 'Send'))
		form.onsubmit = function(e) {
			e.preventDefault()
			app.send('chat', {msg:input.value})
			input.value = ""
		}
		h.add(app.cont, h('#chat-view',
			h('header',
				h('', 'babasite', h('sup', 'beta'), ' ', h('a', {href:'/logout'}, "Logout")),
				h('.menu', app.views.filter(v =>
					v != app.cur && v.name != 'lobby'
				).map(v =>
					h('', {onclick:() => {
						app.send("enter", {room:v.name})
					}}, v.label||v.name)
				)),
				h('h2', app.cur?.label),
			),
			output, form,
		))
		return {
			chat(data:ChatData) {
				addOutput(data.user +": "+ data.msg)
			},
			hist(data:{msgs:ChatData[]}) {
				if (data.msgs) data.msgs.forEach((el:ChatData) =>
					output.appendChild(h('', el.user +": "+ el.msg))
				)
				scrollEnd()
			}
		}
	},
	stop: function() {
		output.innerHTML = ""
	}
}

const output = h('code#output')
function addOutput(text:string) {
	output.appendChild(h('', text))
	scrollEnd()
}
function scrollEnd() {
	output.scrollTop = output.scrollHeight - output.clientHeight
}
app.addOutput = addOutput
