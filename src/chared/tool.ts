import {h} from '../app'
import {Pos, Box, posIn, dimBox, boxGrow, boxCrop} from '../geom'
import {Canvas} from '../canvas'
import {Pixel} from './pal'

export interface PaintCtx {
	c:Canvas
	tmp:TmpPic
	fg:number
	fgcolor:string
}

export const tools = [
	{name:'pen', paint({c, tmp, fg, fgcolor}:PaintCtx, {x, y}:Pos) {
		tmp.paint(x, y, fg || 99)
		c.ctx.fillStyle = fgcolor
		c.ctx.fillRect(x, y, 1, 1)
	}},
	{name:'brush', paint({c, tmp, fg, fgcolor}:PaintCtx, {x, y}:Pos) {
		tmp.rect(x-1, y-1, 3, 3, fg || 99)
		c.ctx.fillStyle = fgcolor
		c.ctx.fillRect(x-1, y-1, 3, 3)
	}},
]

export const opts = [
	{name:'mirror'},
	{name:'grid'},
]

export interface ToolCtx {
	tool:string
	mirror:boolean
	grid:boolean
	repaint():void
}

export function toolView(ctx:ToolCtx) {
	return h('section.tool.inline',
		h('header', 'Tools'),
		h('', tools.map(tool => h('span', {onclick() {
			ctx.tool = tool.name
		}}, tool.name))),
		h('', opts.map(opt => h('span', {onclick() {
			toggleOpt(ctx, opt.name)
			if (opt.name == 'grid') ctx.repaint()
		}}, opt.name)))
	)
}

function toggleOpt(ctx:any, opt:string) {
	ctx[opt] = !ctx[opt]
}

export interface TmpPic {
	data:Pixel[]
	reset():void
	paint(x:number, y:number, pixel:number):void
	rect(x:number, y:number, w:number, h:number, pixel:number):void
}

export function tmpPic(w:number, h:number) {
	const data = new Array(w*h)
	const d = dimBox({w, h})
	let bb:Box = {x:0, y:0, w:0, h:0}
	let tmp = {data,
		// reset min, max and map
		reset() {
			bb = {x:0, y:0, w:0, h:0}
			data.fill(0)
		},
		paint(x:number, y:number, pixel:number) {
			if (!posIn({x, y}, d)) return
			bb = boxGrow(bb, {x, y})
			data[y*w+x] = pixel
		},
		rect(rx:number, ry:number, rw:number, rh:number, pixel:number) {
			const b = boxCrop(d, {x:rx, y:ry, w:rw, h:rh})
			bb = boxGrow(bb, b)
			for (let y=b.y; y<b.x+b.h; y++) {
				for (let x=b.x; x<b.x+b.w; x++) {
					data[y*w+x] = pixel
				}
			}
		},
		getSel() {
			const l = bb.w*bb.h
			if (l <= 0) return null
			const sel = {...bb, data:new Array(l).fill(0)}
			for (let y=0; y < bb.h; y++) {
				let u = y*bb.w
				let v = (y+bb.y)*w
				for (let x=0; x < bb.w; x++) {
					sel.data[u+x] = data[v+(x+bb.x)]
				}
			}
			return sel
		}
	}
	return tmp
}
