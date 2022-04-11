import h from 'web/html'
import {newAnimator} from 'web/animate'
import {ZoomCanvas, newZoomCanvas} from 'web/canvas'
import {Pos, posIn, boxIn, boxCrop, boxGrow} from 'game/geo'
import {GridSel, gridSel, gridTiles, gridEach} from 'game/grid'
import app from 'app'
import {Asset, Sequence} from './asset'
import {Pixel, Pallette} from './pal'
import {PalView, palView} from './pal_view'
import {ToolView, TmpPic, toolView, tmpPic} from './tool'
import {Pic, PicID} from './pic'
import {sequenceView} from './seq_view'

export interface AssetEditor {
	el:HTMLElement
	a:Asset
	c:ZoomCanvas
	tmp:TmpPic
	tool:ToolView
	pal:PalView
	seq:Sequence|null
	idx:number
	pic:Pic|null
	sel:GridSel|null

	repaint():void
	updatePal(p:Pallette):void
	addSeq(s:Sequence):void
	updateSeq(s:Sequence):void
	delSeq(name:string):void
	addPic(pic:Pic):void
	delPic(id:PicID):void
	goto(s:Sequence|null, idx:number, force?:boolean):void
	stop():void
}

export function assetEditor(a:Asset, pals:Pallette[]):AssetEditor {
	Object.keys(a.pics).forEach((k:any) => {
		let p = a.pics[k]
		a.pics[k] = {id:p.id, ...gridTiles<Pixel>(p, p.raw)}
	})
	const ani = newAnimator()
	const c = newZoomCanvas("our-canvas", 800, 600)
	let selPat:CanvasPattern|null
	const seqView = sequenceView(a, ani)
	let ed:AssetEditor = {a, c, el: h(''),
		tmp: tmpPic(a.w, a.h),
		pal: palView(a.pal, pals),
		tool: toolView(),
		seq: a.seq && a.seq.length ? a.seq[0] : null,
		idx:0, pic:null,
		sel: null,
		repaint() {
			c.clear()
			if (!ed.seq||!ed.seq.ids) return
			if (ed.tool.grid) c.grid(8, 16)
			let id = ed.seq.ids[ed.idx]
			let pic = ed.pic = ed.a.pics[id]||null
			if (!pic) return
			for (let y = 0; y < a.h; y++) {
				for (let x = 0; x < a.w; x++) {
					let pos = {x,y}
					let p = ed.tmp.img.get(pos)
					if (!p && posIn(pos, pic)) {
						p = pic.get(pos)
					}
					if (p) {
						c.paintPixel({x, y}, ed.pal.color(p))
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
			ed.pal.update(p)
			c.setStage({bg:ed.pal.color(0)})
			ed.repaint()
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
			ed.tmp.reset()
			ed.repaint()
		},
		stop() {
			ani.close()
		}
	}
	if (ed.seq && ed.seq.ids) ed.pic = a.pics[ed.seq.ids[ed.idx]]
	c.setStage({x:8, y:8, w:a.w, h:a.h, zoom:12, bg: ed.pal.color(0)})
	selPattern(c).then(pat => selPat = pat)

	c.el.addEventListener("contextmenu", e => e.preventDefault())
	c.el.addEventListener("mousedown", e => {
		if (!ed.pic) return
		if (e.button != 2 && e.button != 0) return
		const {active, mirror} = ed.tool
		if (active == 'pen' || active == 'brush') {
			let t = e.button == 0 ? ed.pal.fg : ed.pal.bg
			let color = ed.pal.color(t)
			t = t||99
			let draw:(p:Pos)=>void = active == "pen" ? p => {
					ed.tmp.paint(p.x, p.y, t)
					c.paintPixel(p, color)
				} : ({x, y}) => {
					ed.tmp.rect(x-1, y-1, 3, 3, t)
					c.paintRect({x:x-1, y:y-1, w:3, h:3}, color)
				}
			let paint = (e:MouseEvent) => {
				let p = c.stagePos(e)
				if (!p) return
				draw(p)
				if (mirror) {
					p.x = a.w-p.x-1
					draw(p)
				}
			}
			c.startDrag(paint, e => {
				paint(e)
				let sel = ed.tmp.getSel()
				if (!sel||!ed.pic) return
				app.send("pic.edit", {
					pic:ed.pic.id,
					...sel,
				})
				ed.tmp.reset()
			})
		} else if (active == 'select') {
			if (e.button == 2) {
				ed.sel = null
				ed.repaint()
				return
			}
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
	ed.pal.clickFeat = idx => clickFeat(ed, idx)
	ed.tool.repaint = () => ed.repaint
	c.init(ed.repaint)
	ed.repaint()
	seqView.update(ed)
	h.repl(ed.el, seqView.el, c.el,
		// tools and color pallette
		h('', ed.tool.el, ed.pal.el),
	)
	return ed
}

function clickFeat(ed:AssetEditor, idx:number) {
	if (!ed.pic) return
	let b = {x:0,y:0,w:0,h:0}
	gridEach(ed.pic, (p, t) => {
		if (idx == Math.floor(t/100) && !posIn(p, b))
			b = boxGrow(b, p)
	})
	if (b.w*b.h>0) {
		const sel = gridSel(b)
		gridEach(ed.pic, (p, t) => {
			if (idx == Math.floor(t/100)) sel.set(p, true)
		}, b)
		ed.sel = sel
	} else {
		ed.sel = null
	}
	ed.repaint()
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
