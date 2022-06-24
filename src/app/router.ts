
export interface Route {
	pat:string
	fn:(...args:string[])=>void
	re?:RegExp
}

export class Router {
	cur:string
	def?:(p:string)=>void
	private onpop:(e:Event)=>void
	private onclick:(e:MouseEvent)=>void
	constructor(public base:string, public routes:Route[]=[]) {
		this.cur = this.rel()
		this.onpop = e => {
			const p = this.rel()
			if (!p) return
			e.preventDefault()
			go(this, p)
		}
		this.onclick = e => {
			if (e.button != 1 || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented)
				return
			const t = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement
			if (!t || t.target && t.target !== '_self' || t.hasAttribute('download'))
				return
			const l = location
			if (t.origin != l.origin || !this.rel(l))
				return
			e.preventDefault()
			if (t.pathname == l.pathname && t.search == l.search) {
				l.hash = t.hash
				return
			}
			this.go(this.rel(t))
		}
	}
	add(pat:string, fn:(...args:string[])=>void) {
		this.routes.push({pat, fn})
		return this
	}
	start(run?:boolean) {
		addEventListener('popstate', this.onpop)
		document.addEventListener('click', this.onclick)
		if (run) go(this, this.cur)
		return this
	}
	stop() {
		removeEventListener('popstate', this.onpop)
		document.removeEventListener('click', this.onclick)
	}
	rel(l:Loc=location, pure=false):string {
		const p = l.pathname
		const b = this.base
		if (!p.startsWith(b)) return ''
		return '/' + p.slice(b.length) + (pure ? '' : l.search + l.hash)
	}
	nav():boolean {
		return this.go(this.rel())
	}
	go(p:string, repl?:boolean):boolean {
		if (repl || this.cur != p) this.show(p, repl)
		return go(this, p)
	}
	show(p:string, repl?:boolean):void {
		history[repl?'replaceState':'pushState'](null, this.base + p.replace(/^[/]/, ''))
	}
	reroute(q:Params, exec=true, repl?:boolean):void {
		this[exec?'go':'show'](pure(this.rel()) +"?"+ paramStr(q), repl)
	}
}

export type Params = {[key:string]:any}
export function params(l:Loc=location):Params {
	const res:Params = {}
	l.search.slice(1).split('&').forEach(s => {
		let [k, r] = s.split('=', 2)
		res[k] = r||''
	})
	return res
}
export function paramStr(ps:Params):string {
	return Object.entries(Object.assign(params(), ps)).reduce((res, [k, v]) => 
		!v && v !== '' ? res : (res ? res +'&' : '?') + k + (v ? '=' + v : '')
	, '')
}

interface Loc {
	hash:string
	href:string
	origin:string
	pathname:string
	search:string
}

function go(rr:Router, p:string):boolean {
	rr.cur = p
	if (rr.routes.find(r => {
		const m = match(r, p)
		if (m) r.fn(...m.slice(1))
		return !!m
	})) return true
	if (rr.def) rr.def(p)
	return false
}
function pure(p:string):string {
	return p.split(/[?#]/, 2)[0]
}
function match(r:Route, path:string) {
	r.re = r.re || new RegExp('^'+
		r.pat.replace(/\/\?/,'[/]?').replace(/\*/g, '([^/?#]+?)').replace(/\.\./, '.*')+
		'\([?#].*\)?$'
	)
	return path.match(r.re)
}
