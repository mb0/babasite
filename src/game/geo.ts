
export interface Pos {
	x:number
	y:number
}

export function posEq(a:Pos, b:Pos) { return a.x==b.x && a.y==b.y }
export function posAdd(a:Pos, b:Pos) { return {x:a.x+b.x, y:a.y+b.y} }
export function posSub(a:Pos, b:Pos) { return {x:a.x-b.x, y:a.y-b.y} }
export function posMin(a:Pos, b:Pos):Pos { return {x:Math.min(a.x, b.x), y:Math.min(a.y, b.y)} }
export function posMax(a:Pos, b:Pos):Pos { return {x:Math.max(a.x, b.x), y:Math.max(a.y, b.y)} }
export function posIn({x, y}:Pos, b:Box) {
	return x >= b.x && x < b.x+b.w && y >= b.y && y < b.y+b.h
}

export interface Dim {
	w:number
	h:number
}

export function dimEq(a:Dim, b:Dim) { return a.w==b.w && a.h==b.h }
export function dimBox({w, h}:Dim) { return {x:0, y:0, w, h} }

export interface Box extends Pos, Dim {}

export function boxEq(a:Box, b:Box) { return posEq(a, b) && dimEq(a, b) }
export function boxEnd(b:Box) { return {x:b.x+b.w-1, y:b.y+b.h-1} }
export function boxDim(b:Box) { return {w:b.x+b.w, h:b.y+b.h} }
export function boxIn(b:Box, o:Box) { return posIn(b, o) && posIn(boxEnd(b), o) }
export function boxIdx(b:Box, p:Pos) {
	const {x, y} = posSub(p, b)
	return y*b.w+x
}
export function boxCrop(b:Box, o:Box):Box {
	if (b.w*b.h<=0||o.w*o.h<=0) return {x:0, y:0, w:0, h:0}
	const {x, y} = posMax(o, b)
	const e = posMin(boxEnd(o), boxEnd(b))
	return {x, y, w:Math.max(0, 1+e.x-x), h:Math.max(0, 1+e.y-y)}
}

export function boxGrow(b:Box, p:Pos|Box):Box {
	if (b.w*b.h<=0) return {w:1, h:1, ...p}
	const {x,y} = posMin(b, p)
	const e = posMax('w' in p ? boxEnd(p) : p, boxEnd(b))
	return {x, y, w:1+e.x-x, h:1+e.y-y}
}
export function boxCopy({x,y,w,h}:Box):Box { return {x,y,w,h} }
