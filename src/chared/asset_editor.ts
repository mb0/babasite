import h from 'web/html'
import {newAnimator} from 'web/animate'
import {posIn, boxGrow} from 'game/geo'
import {gridSel, gridEach} from 'game/grid'
import app from 'app'
import {Asset, Sequence} from './asset'
import {Pixel, Palette, palCssColor} from './pal'
import {palView} from './pal_view'
import {toolView} from './tool'
import {Pic, PicID} from './pic'
import {sequenceView} from './seq_view'
import {GridEditor, gridEditor} from 'game/editor'

export interface AssetEditor extends GridEditor<Pixel> {
	el:HTMLElement
	a:Asset
	pal:Palette
	seq:Sequence|null
	idx:number

	updatePal(p:Palette):void
	updateColor():void
	addSeq(s:Sequence):void
	updateSeq(s:Sequence):void
	delSeq(name:string):void
	addPic(pic:Pic):void
	delPic(id:PicID):void
	goto(s:Sequence|null, idx:number, force?:boolean):void
	stop():void
}

export function assetEditor(a:Asset, pals:Palette[]):AssetEditor {
	const ani = newAnimator()
	const pal = pals.find(p => p.name == a.pal)!
	const ed = Object.assign(gridEditor(a, t => palCssColor(ed.pal, t), edit => {
		app.send("pic.edit", {
			...edit,
			pic:ed.img!.id,
		})
		ed.tmp.reset()
	}), {
		el: h(''), a, pal,
		seq: null, idx:0,
		updatePal(p:Palette) {
			ed.a.pal = p.name
			ed.pal = p
			palv.update()
			ed.c.setStage({bg:ed.color(0)})
			if (ed.seq) {
				ed.updateColor()
				ed.updateSeq(ed.seq)
				ed.repaint()
			}
		},
		updateColor() {
			toolv.updateColor()
		},
		addSeq(s:Sequence) {
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
			seqv.update()
			if (ed.seq == s) {
				if (!ed.img && s && ed.idx >= 0) {
					ed.update(a.pics[s.ids[ed.idx]])
					ed.repaint()
				}
			}
		},
		delSeq(name:string) {
			// remove sequence from asset
			let idx = a.seq.findIndex(s => s.name == name)
			if (idx >= 0) a.seq.splice(idx, 1)
			if (ed.seq && ed.seq.name == name) {
				// change selection
				ed.goto(a.seq.length ? a.seq[0] : null, 0)
			}
		},
		addPic(pic:Pic) {
			if (!pic||pic.id <= 0) return
			ed.a.pics[pic.id] = pic
			if (ed.seq && ed.idx >= 0) {
				if (pic.id == ed.seq.ids[ed.idx]) {
					ed.update(pic)
				}
			}
		},
		delPic(id:number) {
			// remove pic from asset seq
			let p = ed.a.pics[id]
			if (!p) return
			delete ed.a.pics[id]
		},
		goto(s:Sequence, idx:number, force?:boolean) {
			idx = idx||0
			if (!force && ed.seq == s && ed.idx == idx) return
			ed.seq = s
			ed.idx = idx
			ed.sel = null
			ed.update(s?.ids ? a.pics[s.ids[idx]] : null)
			seqv.update()
		},
		stop() {
			ani.close()
		}
	}) as AssetEditor
	ed.c.setStage({x:8, y:8, w:a.w, h:a.h, zoom:12, bg: ed.color(0)})
	if (a.seq && a.seq.length) {
		ed.seq = a.seq[0]
		if (ed.seq && ed.seq.ids) {
			ed.update(a.pics[ed.seq.ids[ed.idx]])
		}
	}
	ed.c.el.ondragover = (e:DragEvent) => {
		e.preventDefault()
		e.dataTransfer!.dropEffect = "copy"
	}
	ed.c.el.ondrop = (e:DragEvent) => {
		e.preventDefault()
		if (!ed.img) return
		const [aname, pid] = e.dataTransfer!.getData("application/x-chared").split(':', 2)
		if (aname != a.name) return
		const pic = a.pics[parseInt(pid, 10)]
		if (!pic) return
		app.send("pic.edit", {
			...pic,
			pic:ed.img!.id,
			copy:true,
		})
	}
	const seqv = sequenceView(ed, ani)
	const palv = palView(ed, pals, idx => clickFeat(ed, idx))
	const toolv = toolView(ed)
	h.repl(ed.el, seqv.el, ed.c.el,
		// tools and color palette
		h('', toolv.el, palv.el),
	)
	return ed
}

function clickFeat(ed:AssetEditor, idx:number) {
	if (!ed.img) return
	let b = {x:0,y:0,w:0,h:0}
	gridEach(ed.img, (p, t) => {
		if (idx == Math.floor(t/100) && !posIn(p, b))
			b = boxGrow(b, p)
	})
	if (b.w*b.h>0) {
		const sel = gridSel(b)
		gridEach(ed.img, (p, t) => {
			if (idx == Math.floor(t/100)) sel.set(p, true)
		}, b)
		ed.sel = sel
	} else {
		ed.sel = null
	}
	ed.repaint()
}
