import {Pos, Box, boxCrop, boxDim, boxIdx} from './geo'
export interface GridData extends Box {
	data:Uint16Array
}

export interface Grid<T> extends GridData {
	get(p:Pos):T
	set(p:Pos, t:T):void
}

export function gridMap<T extends number>(box:Box, data:Uint16Array):Grid<T> {
	return {...box, data,
		get(p) { return this.data[boxIdx(this, p)] as T },
		set(p, t) { this.data[boxIdx(this, p)] = t },
	}
}

export interface GridSel extends Grid<boolean> {}
export function gridSel(box:Box, data:Uint16Array):Grid<boolean> {
	return {...box, data,
		get(p) {
			const idx = boxIdx(this, p)
			const bit = 1<<(idx&0xff)
			return (this.data[idx>>4]&bit) != 0
		},
		set(p, t) {
			const idx = boxIdx(this, p)
			const bit = 1<<(idx&0xff)
			this.data[idx>>4] &= t ? bit : ~bit
		},
	}
}

type EachFunc<T> = (p:Pos, t:T)=>boolean|void

export function gridEach<T>(g:Grid<T>, f:EachFunc<T>, b?:Box, not?:T) {
	b = b ? boxCrop(g, b) : g
	if (g.w*g.h<=0) return
	const d = boxDim(g)
	for (let y=g.y; y<d.h; y++) {
		for (let x=g.x; x<d.w; x++) {
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
	let n = gridMap<T>(b, new Uint16Array(b.w*b.h))
	gridEach(s, p => n.set(p, g.get(p)), b, false)
}
