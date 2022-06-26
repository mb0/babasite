import {h, hInput} from 'web/html'
import {app, View} from 'app'
import './chat.css'

export interface ChatData {
	user:string
	msg:string
}

export const chat:View = {
	name: "chat",
	start() {
		const input = hInput('', {name:'chat', placeholder:'Chat', autocomplete:'off'})
		const form = h('form#chat', input, h('button', 'Send'))
		form.onsubmit = function(e) {
			e.preventDefault()
			app.send('chat', {msg:input.value})
			input.value = ""
		}
		app.on(this.subs = {
			chat(data:ChatData) {
				addOutput(data.user +": "+ data.msg)
			},
			hist(data:{msgs:ChatData[]}) {
				if (data.msgs) data.msgs.forEach((el:ChatData) =>
					output.appendChild(h('', el.user +": "+ el.msg))
				)
				scrollEnd()
			}
		})
		return h('#chat-view', output, form)
	},
	stop() {
		app.off(this.subs!)
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
