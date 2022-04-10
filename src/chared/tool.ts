import h from 'web/html'
import {Canvas} from 'web/canvas'
import {Box, posIn, dimBox, boxIn, boxGrow, boxCrop} from 'game/geo'
import {Grid, GridSel, gridTiles, gridSel, gridEach} from 'game/grid'
import {Pixel} from './pal'
import {Sel} from './pic'

export interface PaintCtx {
	c:Canvas
	tmp:TmpPic
	fg:number
	fgcolor:string
}

export const tools = [
	{name:'pen'},
	{name:'brush'},
	{name:'select'},
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
	img:Grid<Pixel>
	sel:GridSel
	reset():void
	paint(x:number, y:number, pixel:number):void
	rect(x:number, y:number, w:number, h:number, pixel:number):void
	getSel():Sel
}

export function tmpPic(w:number, h:number):TmpPic {
	const d = dimBox({w, h})
	const img = gridTiles<Pixel>(d)
	const sel = gridSel(d)
	let min:Box = {x:0,y:0,w:0,h:0}
	let tmp = {img, sel,
		// reset min, max and map
		reset() {
			min = {x:0,y:0,w:0,h:0}
			img.raw.fill(0)
			sel.raw.fill(0)
		},
		paint(x:number, y:number, pixel:number) {
			let p = {x, y}
			if (!posIn(p, img)) return
			if (!posIn(p, min)) min = boxGrow(min, p)
			sel.set(p, true)
			img.set(p, pixel)
		},
		rect(rx:number, ry:number, rw:number, rh:number, pixel:number) {
			const r = boxCrop(img, {x:rx, y:ry, w:rw, h:rh})
			if (r.w*r.h<=0) return
			if (!boxIn(r, min)) min = boxGrow(min, r)
			for (let y=r.y; y<r.y+r.h; y++) {
				for (let x=r.x; x<r.x+r.w; x++) {
					let p = {x, y}
					sel.set(p, true)
					img.set(p, pixel)
				}
			}
		},
		getSel():Sel {
			let n = gridTiles<Pixel>(min)
			gridEach(sel, p => n.set(p, img.get(p)), n, false)
			return n
		},
	}
	return tmp
}
