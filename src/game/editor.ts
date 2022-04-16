import {ZoomCanvas, newZoomCanvas} from 'web/canvas'
import {Pos, Dim, Box, posEq, posIn, posAdd, posSub, dimBox, boxIn, boxCrop, boxGrow} from 'game/geo'
import {Grid, GridSel, GridData, gridTiles, gridSel, gridEach} from 'game/grid'

interface Image<T> extends Grid<T> {
	id:number
}

export interface Float<T> extends Grid<T> {
	mode:'img'|'paste'
}

export interface GridEditor<T> {
	c:ZoomCanvas
	img:Image<T>|null
	sel:GridSel|null
	float:Float<T>|null
	tmp:Tmp<T>
	color(t:T):string
	onedit(e:Edit<T>):void
	tool:ToolCtx<T>
	repaint():void
	update(img:Image<T>|null):void
	close():void
	updateTool?:()=>void
	anchorFloat():void
}

export interface ToolCtx<T> {
	active:string
	mirror:boolean
	grid:boolean
	fg:T
	bg:T
}

export interface Edit<T> extends GridData {
	repl?:boolean
	fill?:T
}

export function gridEditor<T extends number>(d:Dim, color:(t:T)=>string, onedit:(e:Edit<T>)=>void):GridEditor<T> {
	const c = newZoomCanvas("our-canvas", 800, 600)
	let selPat:CanvasPattern|null = null
	selPattern(c).then(pat => selPat = pat)
	const handleCb = (e:Event) => handleClipboard(ed, e as ClipboardEvent)
	const ed:GridEditor<T> = {c, img:null, sel:null, float: null,
		tmp:tmpGrid<T>(d.w, d.h), color, onedit,
		tool:{active:'pen', mirror:false, grid:true, fg:1 as T, bg:0 as T},
		repaint: () => {
			c.clear()
			if (!ed.img) return
			if (ed.tool.grid) c.grid(8, 16)
			for (let pos = {x:0, y:0}; pos.y < d.h; pos.y++) {
				for (pos.x = 0; pos.x < d.w; pos.x++) {
					let t:T|undefined
					if (!ed.float) {
						t = ed.tmp.img.get(pos)
					} else {
						if (posIn(pos, ed.float))
							t = ed.float.get(pos)
						if (!t && ed.float.mode == 'img')
							continue
					}
					if (!t && posIn(pos, ed.img)) {
						t = ed.img.get(pos)
					}
					if (t) c.paintPixel(pos, color(t))
				}
			}
			if (ed.sel) paintSel(c, ed.sel, selPat)
		},
		update(img) {
			ed.float = null
			ed.img = img
			ed.tmp.reset()
			if (ed.updateTool) ed.updateTool()
			ed.repaint()
		},
		close() {
			cbEvents.forEach(typ => window.removeEventListener(typ, handleCb))
		},
		anchorFloat() {
			if (!ed.float) return
			// copy into tmp img
			gridEach(ed.float!, (p, t) => ed.tmp.paint(p, t), ed.tmp.img)
			ed.onedit({...ed.tmp.getGrid(), repl:ed.float.mode == 'img'})
			ed.tmp.reset()
			ed.float = null
			if (ed.updateTool) ed.updateTool()
		},
	}
	c.el.oncontextmenu = e => e.preventDefault()
	c.el.addEventListener("pointerdown", e => {
		if (!ed.img) return
		if (e.button != 2 && e.button != 5 && e.button != 0) return
		const tool = tools[ed.tool.active]
		if (tool) tool(ed, e)
	})
	c.init(ed.repaint)
	cbEvents.forEach(typ => window.addEventListener(typ, handleCb))
	return ed
}

const cbEvents = ["copy", "cut", "paste"]
export function handleClipboard<T extends number>(ed:GridEditor<T>, e:ClipboardEvent) {
	const t = e.target as HTMLElement
	if (!ed.img || !e.clipboardData || t.isContentEditable ||
		t.nodeName == "INPUT" || t.nodeName == "TEXTAREA") return
	const img = ed.img!
	if (e.type == "copy" || e.type == "cut") {
		if (img.w*img.h <= 0) return
		if (ed.sel) {
			const copy = gridTiles(ed.sel)
			gridEach(ed.sel, p => {
				copy.set(p, img.get(p))
				if (e.type == "cut") img.set(p, 0 as T)
			}, img, false)
			clips.setClip(copy)
			if (e.type == "cut") ed.onedit({...ed.sel, fill:0 as T})
			ed.sel = null
		} else {
			const copy = gridTiles(img)
			gridEach(img, (p, t) => copy.set(p, t))
			clips.setClip(copy)
			if (e.type == "cut") {
				ed.onedit({...img, fill:0 as T, raw:[]})
			}
		}
		e.clipboardData.setData("application/x-babagrid", "clips:"+clips.last)
	} else if (e.type == "paste") {
		let data = e.clipboardData.getData("application/x-babagrid")
		if (!data) {
			// TODO think about other usefull data types to support
			return
		}
		if (data.indexOf("clips:") == 0) {
			const clip = parseInt(data.slice(6), 10)
			if (clip != clips.clip?.id) {
				console.error("expected paste clip to match last clip", clip, clips)
				return
			}
			// paste clip as floating tmp img
			const c = clips.clip!
			const copy = gridTiles<T>(c) as Float<T>
			gridEach(c, (p, t) => copy.set(p, t))
			copy.mode = 'paste'
			ed.float = copy
			ed.tmp.reset()
			ed.tool.active = "move"
			if (ed.updateTool) ed.updateTool()
		} else return
	}
	ed.repaint()
	e.preventDefault()
	e.stopPropagation()
}

interface Clips {
	last:number
	clip:Image<any>|null
	setClip(g:Grid<any>):number
}

export const clips:Clips = {
	last:0,
	clip:null,
	setClip: (g) => {
		clips.clip = {...g, id:--clips.last}
		return clips.last
	},
}

export interface Tmp<T> {
	img:Grid<T>
	sel:GridSel
	reset():void
	paint(p:Pos, t:T):void
	rect(b:Box, t:T):void
	getGrid():Grid<T>
	getSel():GridSel
}

export function tmpGrid<T extends number>(w:number, h:number):Tmp<T> {
	const d = dimBox({w, h})
	const img = gridTiles<T>(d)
	const sel = gridSel(d)
	let min:Box = {x:0,y:0,w:0,h:0}
	let tmp = {img, sel,
		// reset min, max and map
		reset() {
			min = {x:0,y:0,w:0,h:0}
			img.raw.fill(0)
			sel.raw.fill(0)
		},
		paint(p:Pos, t:T) {
			if (!posIn(p, img)) return
			if (!posIn(p, min)) min = boxGrow(min, p)
			sel.set(p, true)
			img.set(p, t)
		},
		rect(r:Box, t:T) {
			r = boxCrop(img, r)
			if (r.w*r.h<=0) return
			if (!boxIn(r, min)) min = boxGrow(min, r)
			for (let y=r.y; y<r.y+r.h; y++) {
				for (let x=r.x; x<r.x+r.w; x++) {
					let p = {x, y}
					sel.set(p, true)
					img.set(p, t)
				}
			}
		},
		getGrid():Grid<T> {
			let n = gridTiles<T>(min)
			gridEach(sel, p => n.set(p, img.get(p)), n, false)
			return n
		},
		getSel():GridSel {
			let n = gridSel(min)
			gridEach(sel, p => n.set(p, true), n, false)
			return n
		},
	}
	return tmp
}

/*
TODO fill, and magic selection tool
TODO dither tool: maybe reuse brush with different brush types?
TODO transformation view for selection or the whole pic for move, rotate and mirror
 */

export type Tool<T> = (ed:GridEditor<T>, e:PointerEvent)=>void

export const tools:{[name:string]:Tool<any>} = {
	pen: startDraw(drawPen),
	brush: startDraw(drawBrush),
	select: startSel,
	move: startMove,
}

function drawPen<T>(ed:GridEditor<T>, _:PointerEvent, p:Pos, t:T) {
	ed.tmp.paint(p, t)
	ed.c.paintPixel(p, ed.color(t))
}
function drawBrush<T>(ed:GridEditor<T>, e:PointerEvent, p:Pos, t:T) {
	const s = e.pressure == 0.5 ? 1 : Math.floor((e.pressure*e.pressure)*5)
	const r = {x:p.x-s, y:p.y-s, w:1+2*s, h:1+2*s}
	ed.tmp.rect(r, t)
	ed.c.paintRect(r, ed.color(t))
}
function startDraw<T>(draw:(ed:GridEditor<T>, e:PointerEvent, p:Pos, t:T)=>void):Tool<T> {
	return (ed, e) => {
		const {mirror, fg, bg} = ed.tool
		const t = e.button != 0 ? bg : fg
		const paint = (e:PointerEvent) => {
			const p = ed.c.stagePos(e)
			if (!p) return
			draw(ed, e, p, t)
			if (mirror) {
				p.x = ed.img!.w-p.x-1
				draw(ed, e, p, t)
			}
		}
		ed.c.startDrag(e.pointerId, paint, e => {
			paint(e)
			const sel = ed.tmp.getSel() as Edit<T>
			if (sel.w*sel.h<=0) return
			ed.onedit(Object.assign(sel, {fill:t}))
		})
	}
}

function startSel<T>(ed:GridEditor<T>, e:PointerEvent) {
	if (e.button != 0) {
		ed.sel = null
		ed.repaint()
		return
	}
	const c = ed.c
	const fst = c.stagePos(e)
	if (!fst) return
	let b = {...fst, w:1, h:1}
	let cur = b
	c.startDrag(e.pointerId, e => {
		const p = c.stagePos(e)
		if (!p) return
		cur = boxGrow(b, p)
		// repaint with temporary selection
		ed.repaint()
		c.paintRect(cur, "#0000ff15")
		c.ctx.strokeStyle = "blue"
		c.ctx.strokeRect(cur.x, cur.y, cur.w, cur.h)
	}, e => {
		const p = c.stagePos(e)
		if (p) cur = boxGrow(b, p)
		// update permanent selection and repaint
		const size = cur.w*cur.h
		let sel = size > 0 ? gridSel(cur) : null
		if (sel) sel.raw.fill(0xffff)
		if (e.altKey) {
			if (!ed.sel||!sel) return
			const crop = boxCrop(sel, ed.sel)
			if (crop.w*crop.h<=0) return
			// remove sel from ed.sel
			gridEach(sel, p => ed.sel!.set(p, false), crop, false)
			// TODO shrink selection?
		} else if (e.ctrlKey && ed.sel) {
			if (!sel) return
			if (!boxIn(sel, ed.sel)) {
				const nsel = gridSel(boxGrow(ed.sel, sel))
				gridEach(ed.sel, p => nsel.set(p, true), ed.sel, false)
				ed.sel = nsel
			}
			gridEach(sel, p => ed.sel!.set(p, true), ed.sel, false)
		} else {
			ed.sel = sel
		}
		ed.repaint()
	})
}

function startMove<T extends number>(ed:GridEditor<T>, e:PointerEvent) {
	if (e.button != 0) {
		ed.anchorFloat()
		return
	}
	const c = ed.c
	const fst = c.stagePos(e)
	if (!fst) return
	let lst = fst
	const img = ed.img!
	const move = (e:PointerEvent) => {
		const p = c.stagePos(e)
		if (!p || posEq(p, lst)) return
		if (!ed.float) {
			if (!ed.sel) {
				// whole image
				ed.float = {...img, mode:'img'}
			} else {
				// treat similar to cut
				const copy = gridTiles<T>(ed.sel)
				gridEach(ed.sel, p => {
					copy.set(p, img.get(p))
					img.set(p, 0 as T)
				}, img, false)
				ed.sel = null
				ed.float = {...copy, mode:'paste'}
			}
			if (ed.updateTool) ed.updateTool()
		}
		const diff = posSub(p, lst)
		Object.assign(ed.float, posAdd(ed.float!, diff))
		lst = p
		ed.repaint()
	}
	c.startDrag(e.pointerId, move, e => {
		move(e)
	})
}

function paintSel(c:ZoomCanvas, sel:GridSel, pat:CanvasPattern|null) {
	let {x,y,w,h} = sel
	c.ctx.strokeStyle = "#0000bb"
	c.ctx.strokeRect(x, y, w, h)
	c.ctx.save()
	c.ctx.transform(.5, 0, 0, .5, 0, 0)
	c.ctx.fillStyle = pat || '#0000bb15'
	gridEach(sel, ({x, y}) => {
		c.ctx.fillRect(x*2, y*2, 2, 2)
	}, sel, false)
	c.ctx.restore()
}

async function selPattern(c:ZoomCanvas):Promise<CanvasPattern> {
	const img:ImageData = c.ctx.createImageData(2, 2)
	for (let i=0; i<img.data.length; i += 4) {
		img.data[i] = 127
		img.data[i+1] = 127
		img.data[i+2] = 255
		img.data[i+3] = (!i||i>=12) ? 45 : 15
	}
	const bitmap = await createImageBitmap(img)
	return c.ctx.createPattern(bitmap, "repeat")!
}
