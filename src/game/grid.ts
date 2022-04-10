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
	return {...b, raw: raw || Array(Math.ceil(b.w*b.h/8)).fill(0),
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

type EachFunc<T> = (p:Pos, t:T)=>boolean|void

export function gridEach<T>(g:Grid<T>, f:EachFunc<T>, b?:Box, not?:T) {
	b = b ? boxCrop(g, b) : g
	if (b.w*b.h<=0) return
	const d = boxDim(b)
	for (let y=b.y; y<d.h; y++) {
		for (let x=b.x; x<d.w; x++) {
			const p = {x, y}
			const t = g.get(p)
			if (t !== not && f(p, t) === false)
				return
		}
	}
}

function setSel(dst:GridSel, src:GridSel) { gridEach(src, (p, t) => dst.set(p, t), dst) }
function addSel(dst:GridSel, src:GridSel) { gridEach(src, p => dst.set(p, true), dst, false) }
function subSel(dst:GridSel, src:GridSel) { gridEach(src, p => dst.set(p, false), dst, false) }
function fill<T>(g:Grid<T>, s:GridSel, t:T) { gridEach(s, p => g.set(p, t), g, false) }
function selGrid<T extends number>(g:Grid<T>, s:GridSel) {
	let b = boxCrop(s, boxCrop(g, s))
	let n = gridTiles<T>(b)
	gridEach(s, p => n.set(p, g.get(p)), b, false)
}
