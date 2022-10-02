import h from "web/html"
import './snack.css'

class SnackbarManager {
	par:HTMLElement
	cont:HTMLElement
	constructor() {
		this.par = h(".snack-par", this.cont = h(".snacks"))
	}
	show(line:string, timeout=5000):Function {
		return this.act(line, timeout)
	}
	act(line:string, timeout=5000, link?:string, act?:Function):Function {
		if (!line && !link) return ()=>{}
		let tok:number|undefined
		let clear = () => {
			if (tok) clearTimeout(tok)
			if (!div.parentNode) return
			this.cont.removeChild(div)
			if (this.par.parentNode && this.cont.childElementCount == 0) {
				document.body.removeChild(this.par)
			}
		}
		let a:HTMLElement|null = null
		if (link && act) {
			a = h("a", {href:"?", style:"float:right", onclick: e=> {
				e.preventDefault()
				e.cancelBubble = true
				clear()
				act()
			}}, link)
		}
		let div = h("", line, a)
		if (this.cont.childElementCount == 0) {
			document.body.appendChild(this.par)
		}
		this.cont.appendChild(div)
		if (timeout>0) tok = window.setTimeout(clear, timeout)
		div.onclick = clear
		return clear
	}
}

var snack = new SnackbarManager()

export default snack
