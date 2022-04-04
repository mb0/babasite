import {h} from './app'

export function hInput(sel:string, opts?:any) {
	sel = sel||'input'
	if (sel[0]=='.'||sel[0]=='#') sel = 'input'+sel
	opts = opts||{}
	if (!opts.type) opts.type='text'
	return h(sel, opts) as HTMLInputElement
}

export function datalistInput(id:string, hand?:(opt:string)=>void) {
	let opts:string[] = []
	const list = h('datalist', {id})
	const input = hInput('', {list:id})
	const check = () => {
		let name = input.value.trim()
		let opt = opts.find(opt => opt == name)
		if (!opt) return false
		if (hand) {
			hand(opt)
			input.value = ""
		}
		return true
	}
	input.oninput = check
	return {el: h('span', list, input), list, input, check, update(names:string[]) {
		opts = names
		h.repl(list, opts.map(name => h('option', name)))
	}}
}

const input = hInput('', {type:'color', style:'display:none;'})
export function pickColor(val:string, submit:(val:string)=>void) {
	input.value = val
	input.onchange = () => {
		if (input.value[0]=='#') submit(input.value.slice(1))
	}
	input.click()
}
