import {Pos, Box, boxCrop, boxDim, boxIdx} from './geo'
export interface GridData extends Box {
	raw:number[]
}

export interface Grid<T> extends GridData {
	get(p:Pos):T
	set(p:Pos, t:T):void
}

export function gridTiles<T extends number>(b:Box, raw?:number[]):Grid<T> {
	return {...b, raw: raw || Array(b.w*b.h).fill(0),
		get(p) { return this.raw[boxIdx(this, p)] as T },
		set(p, t) { this.raw[boxIdx(this, p)] = t },
	}
}

export interface GridSel extends Grid<boolean> {}
export function gridSel(b:Box, raw?:number[]):Grid<boolean> {
	return {...b, raw: raw || Array(Math.ceil(b.w*b.h/16)).fill(0),
		get(p) {
			const idx = boxIdx(this, p)
			const bit = 1<<(idx&0xf)
			return (this.raw[idx>>4]&bit) != 0
		},
		set(p, t) {
			const idx = boxIdx(this, p)
			const bit = 1<<(idx&0xf)
			const u = this.raw[idx>>4]
			this.raw[idx>>4] = t ? u|bit : u&(~bit)
		},
	}
}

type EachFunc<T> = (p:Pos, t:T)=>void

export function gridEach<T>(g:Grid<T>, f:EachFunc<T>, b?:Box, not?:T) {
	b = b ? boxCrop(g, b) : g
	if (b.w*b.h<=0) return
	const d = boxDim(b)
	for (let y=b.y; y<d.h; y++) {
		for (let x=b.x; x<d.w; x++) {
			const p = {x, y}
			const t = g.get(p)
			if (t !== not) f(p, t)
		}
	}
}

export function gridMirrorH<T>(g:Grid<T>) {
	const hw = Math.floor(g.w/2)
	for (let y=0; y < g.h; y++) {
		for (let x=0; x < hw; x++) {
			const p = {x:g.x+x, y:g.y+y}
			const o = {x:g.x+g.w-1-x, y:p.y}
			const t = g.get(p)
			g.set(p, g.get(o))
			g.set(o, t)
		}
	}
}

export function gridMirrorV<T>(g:Grid<T>) {
	const hh = Math.floor(g.h/2)
	for (let y=0; y < hh; y++) {
		for (let x=0; x < g.w; x++) {
			const p = {x:g.x+x, y:g.y+y}
			const o = {x:p.x, y:g.y+g.h-1-y}
			const t = g.get(p)
			g.set(p, g.get(o))
			g.set(o, t)
		}
	}
}

export function gridTranspose<T>(g:Grid<T>) {
	const {w,h} = g
	if (w == h) {
		for (let y=0; y<h; y++) {
			for (let x=y+1; x<w; x++) {
				const p = {x:g.x+x, y:g.y+y}
				const o = {x:g.x+y, y:g.y+x}
				const t = g.get(p)
				g.set(p, g.get(o))
				g.set(o, t)
			}
		}
		return
	} else {
		const n = {...g, w:h, h:w, raw:Array(g.raw.length)}
		for (let y=0; y<h; y++) {
			for (let x=0; x<w; x++) {
				const p = {x:g.x+x, y:g.y+y}
				const o = {x:g.x+y, y:g.y+x}
				n.set(o, g.get(p))
			}
		}
		Object.assign(g, n)
	}
}

export function gridRot90<T>(g:Grid<T>) {
	gridMirrorV(g)
	gridTranspose(g)
}
export function gridRot180<T>(g:Grid<T>) {
	gridMirrorH(g)
	gridMirrorV(g)
}
export function gridRot270<T>(g:Grid<T>) {
	gridTranspose(g)
	gridMirrorV(g)
}
