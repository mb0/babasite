import {h, HData} from 'web/html'
export type Handler = (...args:string[])=>void
export type Routes = {[pat:string]:Handler}

export interface Route {
	pat:string
	fn:Handler
	re?:RegExp
}

export class Router {
	cur:string
	def?:(p:string)=>void
	title:string
	private onpop:(e:Event)=>void
	readonly onclick:(e:MouseEvent)=>void
	constructor(public base:string, public routes:Route[]=[]) {
		this.title = document.title
		this.cur = this.rel()
		document.title = this.title + " "+ this.cur
		this.onpop = e => {
			const p = this.rel()
			if (!p) return
			e.preventDefault()
			go(this, p)
		}
		this.onclick = e => {
			if (e.button != 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented)
				return
			const t = e.target as HTMLAnchorElement
			if (!t) return
			e.preventDefault()
			this.go(this.rel(t))
		}
	}
	add(pat:string, fn:(...args:string[])=>void) {
		this.routes.push({pat, fn})
		return this
	}
	start(run?:boolean) {
		addEventListener('popstate', this.onpop)
		if (run) go(this, this.cur)
		return this
	}
	stop() {
		removeEventListener('popstate', this.onpop)
	}
	rel(l:Loc=location, pure=false):string {
		const p = l.pathname || ''
		const b = this.base
		if (!p.startsWith(b)) return ''
		return '/' + p.slice(b.length) + (pure ? '' : l.search + l.hash)
	}
	link(href:string, title:HData, opts?:any):HTMLElement {
		return h('a', {...opts, href, onclick: this.onclick}, title)
	}
	go(p:string, repl?:boolean):boolean {
		if (repl || this.cur != p) this.show(p, repl)
		return go(this, p)
	}
	show(p:string, repl?:boolean):void {
		this.cur = p
		document.title = this.title + " "+ p
		history[repl?'replaceState':'pushState'](null, '', this.base + p.replace(/^[/]/, ''))
	}
	ensure(p:string):void {
		if (this.cur != p) this.show(p, true)
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
		r.pat.replace(/\/\?/,'[/]?').replace(/\*/g, '([^/?#]+?)').replace(/\.\./, '([^?#]*)')+
		'(?:[?#].*)?$'
	)
	return path.match(r.re)
}
