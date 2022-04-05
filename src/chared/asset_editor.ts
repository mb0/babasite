import {app, h} from '../app'
import {newZoomCanvas} from '../canvas'
import {newAnimator} from '../ani'
import {Asset, Sequence, assetColor} from './asset'
import {Pallette, cssColor} from './pal'
import {PalView, PalCtx, palView} from './pal_view'
import {ToolCtx, PaintCtx, toolView, tmpPic, tools} from './tool'
import {Pic, PicID} from './pic'
import {sequenceView} from './seq_view'

export interface AssetEditor extends PalCtx, ToolCtx, PaintCtx {
	el:HTMLElement
	pal:PalView
	seq:Sequence|null
	idx:number
	pic:Pic|null

	updatePal(p:Pallette):void
	addSeq(s:Sequence):void
	updateSeq(s:Sequence):void
	delSeq(name:string):void
	addPic(pic:Pic):void
	delPic(id:PicID):void
	sel(s:Sequence|null, idx:number, force?:boolean):void
	stop():void
}

export function assetEditor(a:Asset, pals:Pallette[]):AssetEditor {
	const ani = newAnimator()
	const c = newZoomCanvas("our-canvas", 800, 600)
	c.resize(a.w, a.h)
	c.zoom(12)
	c.move(8, 8)
	c.stage.bg = cssColor(assetColor(a, 0))
	let tmp = tmpPic(a.w, a.h)
	const seqView = sequenceView(a, ani)
	let ed:AssetEditor = {a, c, el: h(''), tmp, pals, pal: palView(),
		seq: a.seq && a.seq.length ? a.seq[0] : null,
		idx:0, pic:null,
		tool:'pen', mirror:false, grid:true,
		fg:1, fgcolor:cssColor(assetColor(a, 1)),
		repaint() {
			c.clear()
			if (!ed.seq||!ed.seq.ids) return
			if (ed.grid) c.grid(8, 16)
			let id = ed.seq.ids[ed.idx]
			let pic = ed.pic = ed.a.pics[id]||null
			if (!pic) return
			for (let y = 0; y < a.h; y++) {
				for (let x = 0; x < a.w; x++) {
					let idx = y*a.w+x
					let p = tmp.data[idx]
					if (!p && pic.w > 0 && pic.h > 0) {
						let py = y-pic.y
						let px = x-pic.x
						if (py >= 0 && py < pic.h && px >= 0 && px < pic.w) {
							p = pic.data[py*pic.w+px]
						}
					}
					if (p) {
						c.paintPixel({x, y}, cssColor(assetColor(a, p)))
					}
				}
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
				ed.sel(s, 0)
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
				ed.sel(a.seq.length ? a.seq[0] : null, 0)
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
		sel(s, idx, force) {
			idx = idx||0
			if (!force && ed.seq == s && ed.idx == idx) return
			ed.seq = s
			ed.idx = idx
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
		let t = tools.find(t => t.name == ed.tool)
		if (ed.tool == 'pen' || ed.tool == 'brush') {
			let paint = (e:MouseEvent) => {
				let p = c.stagePos(e)
				if (!p||!t) return
				t.paint(ed, p)
				if (ed.mirror) {
					p.x = a.w-p.x-1
					t.paint(ed, p)
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
