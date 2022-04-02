import {h} from './app'

let cssStyle = `
#modalparent {
    display:none;
    position:fixed;
    z-index:100;
    left:0; top:0;
    width:100vw;
    height:100vh;
    background-color:rgba(255,255,255,.7);
    align-items: center;
    justify-content: center;
}
#modal {
	padding: 16px 32px;
	top: 36px;
	width: 98vw;
	max-width: 800px;
	max-height: 91vh;
	overflow-y: auto;

    background-color: white;
	border-radius: 2px;
	box-shadow: 0 2px 2px 0 rgba(0, 0, 0, .14),
		0 1px 5px 0 rgba(0, 0, 0, .12),
		0 3px 1px -2px rgba(0, 0, 0, .2);
}
`

let last = 0
let stack = []
let appDiv = document.getElementById('app')
let par, cont = document.getElementById('modal')
if (cont) {
    par = cont.parentElement
} else {
    document.body.appendChild(par = h('#modalparent',
        cont = h('#modal'),
        h('style', cssStyle),
    ))
}
export function mount(el) {
    let layer = {id:++last, el, foc: document.activeElement}
    stack.forEach(l => l.el.style.display = 'none')
    stack.push(layer)
    cont.appendChild(el)
    focus(layer.el)
    start()
}
export function mounted() {
    return stack.length
}
export function unmount() {
    let layer = stack.pop()
    if (!layer) return
    cont.removeChild(layer.el)
    if (!stack.length) {
        stop()
    } else {
        let prev = stack[stack.length-1]
        prev.el.style.display = 'block'
    }
    if (layer.foc) layer.foc.focus()
}
export function unmountAll() {
    stack = []
    stop()
}
let active = false
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
let listeners = {
    keydown: e => {
        if (e.keyCode == 27) unmount()
    },
    focusin: e => {
        if (!cont.contains(e.target)) {
            e.stopPropagation()
            focus(cont)
        }
    },
}
function focus(el) {
    let foc = el.querySelector('input, select, textarea, button')
    if (foc) foc.focus()   
}
