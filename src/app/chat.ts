import {h, hInput} from 'web/html'
import {View} from 'app'

export interface ChatData {
	user:string
	msg:string
}

const style = `
#chat-view {
	display: flex;
	flex-direction: column;
}
#output {
	flex: 1 1 0;
	overflow-y:auto;
}
#chat-view form {
	display: flex;
}
#chat-view input[type=text] {
	flex: 1 1 auto;
}
#chat-view input[type=submit] {
	flex: 0 0 auto;
}
`

export const chat:View = {
	name: "chat",
	start(app) {
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
		return h('#chat-view', h('style', style),
			h('h4', "Chat"),
			output, form,
		)
	},
	stop(app) {
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
