
export type HArg = {[key:string]:any}
export type HData = HTMLElement|SVGElement|string|HData[]|null

const selRegex = /^(\w+)?(?:#([^.]*))?(?:[.]([^ ]*))?$/
export function h(sel:string, args?:HArg|HData, ...data:HData[]):HTMLElement {
	let m = sel.match(selRegex)
	if (!m) throw new Error("invalid selector: "+sel)
	let el = document.createElement(m[1]||'div')
	if (m[2]) el.id = m[2]
	if (m[3]) el.className = m[3].replace('.', ' ')
	if (args && !addChild(el, args)) {
		Object.keys(args).forEach(key => {
			const v = args[key]
			if (key == 'list' || key == 'for') {
				el.setAttribute(key, v)
			} else if (!key.indexOf("data-")) {
				el.dataset[key.slice(5)] = v
			} else (el as any)[key] = v
		})
	}
	if (data) addChild(el, data)
	return el
}
h.add = (el:HTMLElement, ...data:HData[]) => addChild(el, data)
h.repl = (el:HTMLElement, ...data:HData[]) => {
	el.innerHTML = ""
	return addChild(el, data)
}
export default h

function addChild(el:HTMLElement, data:HArg|HData):data is HData {
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

let maxFormID = 0
export const formID = ():string => 'f'+ (++maxFormID)

export function hInput(sel:string, opts?:any) {
	if (!sel || sel[0] == '.' || sel[0] == '#') sel = 'input' + sel
	opts = opts||{}
	if (!opts.type) opts.type='text'
	const el = h(sel, opts) as HTMLInputElement
	if (!el.id) el.id = formID()
	return el
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

export function hIcon(name:string, opts?:any) {
	const el = h('i.icon', opts||{title:name})
	el.innerHTML = `<svg><use href="/ic.svg#${ name }" /></svg>`
	return el
}
