import h from 'web/html'
import {newAnimator} from 'web/animate'
import {ZoomCanvas, newZoomCanvas} from 'web/canvas'
import {Pos, posIn, boxIn, boxCrop, boxGrow} from 'game/geo'
import {GridSel, gridSel, gridTiles, gridEach} from 'game/grid'
import app from 'app'
import {Asset, Sequence, assetColor} from './asset'
import {Pixel, Pallette, cssColor} from './pal'
import {PalView, palView} from './pal_view'
import {ToolCtx, PaintCtx, toolView, tmpPic} from './tool'
import {Pic, PicID} from './pic'
import {sequenceView} from './seq_view'

export interface AssetEditor extends ToolCtx, PaintCtx {
	a:Asset
	el:HTMLElement
	pal:PalView
	pals:Pallette[]
	seq:Sequence|null
	idx:number
	pic:Pic|null
	sel:GridSel|null
	fg:Pixel
	fgcolor:string

	updatePal(p:Pallette):void
	addSeq(s:Sequence):void
	updateSeq(s:Sequence):void
	delSeq(name:string):void
	addPic(pic:Pic):void
	delPic(id:PicID):void
	goto(s:Sequence|null, idx:number, force?:boolean):void
	stop():void
}

async function selPattern(c:ZoomCanvas):Promise<CanvasPattern> {
	const img:ImageData = c.ctx.createImageData(2, 2)
	for (let i=0; i<img.data.length; i += 4) {
		img.data[i+2] = 127
		img.data[i+2] = 127
		img.data[i+2] = 255
		img.data[i+3] = (!i||i>=12) ? 45 : 15
	}
	const bitmap = await createImageBitmap(img)
	return c.ctx.createPattern(bitmap, "repeat")!
}

export function assetEditor(a:Asset, pals:Pallette[]):AssetEditor {
	Object.keys(a.pics).forEach((k:any) => {
		let p = a.pics[k]
		a.pics[k] = {id:p.id, ...gridTiles<Pixel>(p, p.raw)}
	})
	const ani = newAnimator()
	const c = newZoomCanvas("our-canvas", 800, 600)
	c.resize(a.w, a.h)
	c.zoom(12)
	c.move(8, 8)
	c.stage.bg = cssColor(assetColor(a, 0))
	let selPat:CanvasPattern|null
	selPattern(c).then(pat => selPat = pat)
	let tmp = tmpPic(a.w, a.h)
	const seqView = sequenceView(a, ani)
	let ed:AssetEditor = {a, c, el: h(''), tmp, pals, pal: palView(),
		seq: a.seq && a.seq.length ? a.seq[0] : null,
		idx:0, pic:null,
		tool:'pen', mirror:false, grid:true,
		fg:1, fgcolor:cssColor(assetColor(a, 1)),
		sel: null,
		repaint() {
			c.clear()
			if (!ed.seq||!ed.seq.ids) return
			if (ed.grid) c.grid(8, 16)
			let id = ed.seq.ids[ed.idx]
			let pic = ed.pic = ed.a.pics[id]||null
			if (!pic) return
			for (let y = 0; y < a.h; y++) {
				for (let x = 0; x < a.w; x++) {
					let pos = {x,y}
					let p = tmp.img.get(pos)
					if (!p && posIn(pos, pic)) {
						p = pic.get(pos)
					}
					if (p) {
						c.paintPixel({x, y}, cssColor(assetColor(a, p)))
					}
				}
			}
			if (ed.sel) {
				let {x,y,w,h} = ed.sel
				c.ctx.strokeStyle = "#0000bb"
				c.ctx.strokeRect(x, y, w, h)
				c.ctx.save()
				c.ctx.transform(.5, 0, 0, .5, 0, 0)
				c.ctx.fillStyle = selPat || '#0000bb15'
				gridEach(ed.sel, ({x, y}) => {
					c.ctx.fillRect(x*2, y*2, 2, 2)
				}, ed.sel, false)
				c.ctx.restore()
			}
		},
		updatePal(p) {
			ed.a.pal = p
			ed.repaint()
			ed.pal.update(ed)
		},
		addSeq(s) {
			// add sequence to asset
			let idx = a.seq.findIndex(f => f.name == s.name)
			if (idx >= 0) {
				a.seq[idx] = s
			} else {
				a.seq.push(s)
				ed.updateSeq(s)
			}
			if (!ed.seq) {
				ed.goto(s, 0)
			}
		},
		updateSeq(s:Sequence) {
			seqView.update(ed)
			if (ed.seq == s) {
				if (!ed.pic && s && ed.idx >= 0) {
					ed.pic = a.pics[s.ids[ed.idx]]
					ed.repaint()
				}
			}
		},
		delSeq(name) {
			// remove sequence from asset
			let idx = a.seq.findIndex(s => s.name == name)
			if (idx >= 0) a.seq.splice(idx, 1)
			if (ed.seq && ed.seq.name == name) {
				// change selection
				ed.goto(a.seq.length ? a.seq[0] : null, 0)
			}
		},
		addPic(pic) {
			if (!pic||pic.id <= 0) return
			ed.a.pics[pic.id] = pic
			if (ed.seq && ed.idx >= 0) {
				if (pic.id == ed.seq.ids[ed.idx]) {
					ed.pic = pic
					ed.repaint()
				}
			}
		},
		delPic(id) {
			// remove pic from asset seq
			let p = ed.a.pics[id]
			if (!p) return
			delete ed.a.pics[id]
		},
		goto(s, idx, force) {
			idx = idx||0
			if (!force && ed.seq == s && ed.idx == idx) return
			ed.seq = s
			ed.idx = idx
			ed.sel = null
			ed.pic = s?.ids ? a.pics[s.ids[idx]] : null
			seqView.update(ed)
			tmp.reset()
			ed.repaint()
		},
		stop() {
			ani.close()
		}
	}
	if (ed.seq && ed.seq.ids) ed.pic = a.pics[ed.seq.ids[ed.idx]]
	c.el.addEventListener("mousedown", e => {
		if (!ed.pic) return
		if (e.button != 0) return
		if (ed.tool == 'pen' || ed.tool == 'brush') {
			let draw:(p:Pos)=>void = ed.tool == "pen" ? p => {
					tmp.paint(p.x, p.y, ed.fg || 99)
					c.paintPixel(p, ed.fgcolor)
				} : ({x, y}) => {
					tmp.rect(x-1, y-1, 3, 3, ed.fg || 99)
					c.paintRect({x:x-1, y:y-1, w:3, h:3}, ed.fgcolor)
				}
			let paint = (e:MouseEvent) => {
				let p = c.stagePos(e)
				if (!p) return
				draw(p)
				if (ed.mirror) {
					p.x = a.w-p.x-1
					draw(p)
				}
			}
			c.startDrag(paint, e => {
				paint(e)
				let sel = tmp.getSel()
				if (!sel||!ed.pic) return
				app.send("pic.edit", {
					pic:ed.pic.id,
					...sel,
				})
				tmp.reset()
			})
		} else if (ed.tool == 'select') {
			const fst = c.stagePos(e)
			if (!fst) return
			let b = {...fst, w:1, h:1}
			let cur = b
			c.startDrag(e => {
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
	})
	c.init(ed.repaint)
	ed.repaint()
	seqView.update(ed)
	ed.pal.update(ed)
	h.repl(ed.el, seqView.el, c.el,
		// tools and color pallette
		h('', toolView(ed), ed.pal.el),
	)
	return ed
}
