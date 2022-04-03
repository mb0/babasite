import {h} from '../app'
import {Pos, MinMax} from '../geom'
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
	const len = w*h
	const data = new Array(w*h)
	let mm = new MinMax({w, h})
	let tmp = {data,
		// reset min, max and map
		reset() {
			mm = new MinMax({w, h})
			for (let i=0; i<len; i++) data[i] = 0
		},
		paint(x:number, y:number, pixel:number) {
			mm.add({x, y})
			data[y*w+x] = pixel
		},
		rect(rx:number, ry:number, rw:number, rh:number, pixel:number) {
			let x2 = Math.min(rx+rw-1, w-1)
			let y2 = Math.min(ry+rh-1, h-1)
			let x1 = Math.max(rx, 0)
			let y1 = Math.max(ry, 0)
			mm.add({x:x1, y:y1})
			mm.add({x:x2, y:y2})
			for (let y=y1; y<=y2; y++) {
				for (let x=x1; x<=x2; x++) {
					data[y*w+x] = pixel
				}
			}
		},
		getSel() {
			const b = mm.box()
			if (b.w <= 0 || b.h <= 0) return null
			const sel = {...b, data:new Array(b.w*b.h).fill(0)}
			for (let y=0; y < b.h; y++) {
				let u = y*b.w
				let v = (y+b.y)*w
				for (let x=0; x < b.w; x++) {
					sel.data[u+x] = data[v+(x+b.x)]
				}
			}
			return sel
		}
	}
	return tmp
}
