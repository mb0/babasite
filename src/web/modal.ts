import h from 'web/html'
import './modal.css'

interface Layer {
	id:number
	el:HTMLElement
	foc:Element|null
}

let last = 0
let stack:Layer[] = []
let appDiv = document.getElementById('app')!
let cont = document.getElementById('modal') || createModal()
let par = cont.parentElement!
function createModal() {
	let cont = h('#modal')
	h.add(document.body, h('#modalparent', cont))
	return cont
}

export function mount(el:HTMLElement) {
	let layer:Layer = {id:++last, el, foc: document.activeElement}
	stack.forEach(l => l.el.style.display = 'none')
	stack.push(layer)
	h.add(cont, el)
	start()
	focus(layer.el)
}

export function mounted() {
	return stack.length
}

export function unmount() {
	let layer = stack.pop()
	if (!layer) return
	cont.removeChild(layer.el)
	layer.el.dispatchEvent(new Event('unmount'))
	if (!stack.length) {
		stop()
	} else {
		let prev = stack[stack.length-1]
		prev.el.style.display = 'block'
	}
	if (layer.foc) (layer.foc as any).focus()
}

export function unmountAll() {
	stack = []
	stop()
}

let active = false
let listeners:{[key:string]:any} = {
	keydown: (e:KeyboardEvent) => {
			if (e.key == "Esc" || e.key == "Escape") unmount()
	},
	focusin: (e:Event) => {
		if (!cont.contains(e.target as Node)) {
			e.stopPropagation()
			focus(cont!)
		}
	},
}
function start() {
	if (active) return
	active = true
	Object.keys(listeners).forEach(key => {
		document.addEventListener(key, listeners[key])
	})
	par.onclick = e => {
		if (e.target == par) unmount()
	}
	par.style.display = 'flex'
	appDiv.setAttribute('aria-hidden', 'true')
}
function stop() {
	if (!active) return
	active = false
	Object.keys(listeners).forEach(key => {
		document.removeEventListener(key, listeners[key])
	})
	par.onclick = null
	par.style.display = 'none'
	cont.innerHTML = ''
	appDiv.setAttribute('aria-hidden', 'false')
}
function focus(el:HTMLElement) {
	let foc:any = el.querySelector('input, select, textarea, button')
	if (foc) foc.focus()
}
