
export interface Pos {
	x:number
	y:number
}

export interface Size {
	w:number
	h:number
}

export interface Box extends Pos, Size {}

export function posInBox(p:Pos, b:Box) {
	return p.x >= b.x && p.x < b.x+b.w && p.y >= b.y && p.y < b.y+b.h
}
export function boxEnd(b:Box) {
	return {x:b.x+b.w-1, y:b.y+b.h-1}
}
export function boxContains(b:Box, o:Box) {
	return posInBox(o, b) && posInBox(boxEnd(o), b)
}

export class MinMax {
	min:Pos
	max:Pos
	constructor({w, h}:Size) {
		this.min = {x:w, y:h}
		this.max = {x:0, y:0}
	}
	add({x, y}:Pos) {
		const {min, max} = this
		if (y < min.y) min.y = y
		if (y > max.y) max.y = y
		if (x < min.x) min.x = x
		if (x > max.x) max.x = x
	}
	box():Box {
		const {min, max} = this
		const {x, y} = min
		return {x, y, w:1+max.x-x, h:1+max.y-y}
	}
}
