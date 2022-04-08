import {Box, boxEnd} from 'game/geo'
import {Pixel} from './pal'

export interface Sel extends Box { data:Pixel[] }

export type PicID = number
export interface Pic extends Sel { id:PicID }

export interface EditPic extends Sel {
	pic:PicID
	copy?:boolean
}

export function growPic(p:Pic, o:Box) {
	if (o.w<=0||o.h<=0) return
	if (p.w<=0||p.h<=0) {
		p.x = o.x
		p.y = o.y
		p.w = o.w
		p.h = o.h
		p.data = new Array(p.w*p.h).fill(0)
	} else {
		const e = boxEnd(p)
		const f = boxEnd(o)
		e.x = Math.max(e.x, f.x)
		e.y = Math.max(e.y, f.y)
		const x = Math.min(p.x, o.x)
		const y = Math.min(p.y, o.y)
		const w = 1+e.x-x
		const h = 1+e.y-y
		const tmp:Sel = {x, y, w, h, data:new Array(w*h).fill(0)}
		copySel(tmp, p)
		Object.assign(p, tmp)
	}
}

export function copySel(pic:Sel, sel:Sel, copy?:boolean) {
	for (let i=0; i < sel.data.length; i++) {
		let p = sel.data[i]
		if (!p && !copy) continue
		let y = sel.y+Math.floor(i/sel.w) - pic.y
		let x = sel.x+(i%sel.w) - pic.x
		pic.data[y*pic.w+x] = p == 99 ? 0 : p
	}
}
