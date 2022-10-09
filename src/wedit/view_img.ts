import h from 'web/html'
import {Layout} from 'game/dock'
import {GridEditor} from 'game/editor'
import {Pal, Img, Clip, Pic, palColor} from 'game/pix'
import app from 'app'
import {WorldData} from './world'
import {kindSelect, nameInput, dimInput, namedListSelect, simpleForm} from './form'
import {PalView} from './view_pal'
import {ClipCtx, ClipPreview, ClipView} from './view_clip'
import {gridEach, gridSel} from 'game/grid'
import {boxGrow, posIn} from 'game/geo'
import {newAnimator} from 'web/animate'

export interface PicData {
	id:number
	pics:Pic[]
}

export class ImgView {
	ed:GridEditor<number>
	ator=newAnimator()
	img:Img
	pal:Pal
	clips:Clip[]
	clip?:Clip
	palv:PalView
	clipv:ClipView
	prev:ClipPreview
	constructor(public wd:WorldData, dock:Layout, id:number) {
		this.img = wd.img.get(id)!
		this.pal = wd.pal.get(this.img.pal)!
		this.clips = wd.clip.all(c => c.img == id)
		let dim = {w:this.img.w, h:this.img.h}
		const ed = this.ed = new GridEditor(dim, t => palColor(this.pal, t), edit => {
			app.send("pic.edit", {
				...edit,
				img:this.img.id,
				pic:ed.img!.id,
			})
			ed.tmp.reset()
		})
		ed.c.el.ondragover = (e:DragEvent) => {
			e.preventDefault()
			e.dataTransfer!.dropEffect = "copy"
		}
		ed.c.el.ondrop = (e:DragEvent) => {
			e.preventDefault()
			if (!ed.img) return
			const [wname, pid] = e.dataTransfer!.getData("application/x-wedit-pic").split(':', 2)
			if (wname != wd.name) return
			const pic = wd.pics.get(parseInt(pid, 10))
			if (!pic) return
			app.send("pic.edit", {
				...pic,
				img:this.img.id,
				pic:ed.img!.id,
				copy:true,
			})
		}
		ed.c.setStage({x:8, y:8, w:dim.w, h:dim.h, zoom:12, bg:ed.color(0)})
		this.clipv = new ClipView(this as ClipCtx)
		h.repl(dock.main, h('#img-view', this.clipv.el, ed.c.el))
		dock.add(this.palv = new PalView(this, idx => {
			let b = {x:0,y:0,w:0,h:0}
			gridEach(ed.img!, (p, t) => {
				if (idx == Math.floor(t/100) && !posIn(p, b))
					b = boxGrow(b, p)
			})
			if (b.w*b.h>0) {
				const sel = gridSel(b)
				gridEach(ed.img!, (p, t) => {
					if (idx == Math.floor(t/100)) sel.set(p, true)
				}, b)
				ed.sel = sel
			} else {
				ed.sel = undefined
			}
			ed.repaint()
		}), 1)
		dock.add(this.prev = new ClipPreview(this as ClipCtx), 2)
		ed.updateTool = () => this.palv.toolv.updateTool()
	}
	show(clip?:Clip, pic?:Pic) {
		const {ed, wd, img, clipv, prev} = this
		if (clip != this.clip) {
			this.clip = clip
			if (clip) {
				ed.c.setStage({w:clip.w, h:clip.h})
			}
			clipv.update()
			prev.update()
		}
		if (clip?.seq && !pic) {
			const fr = clip.seq[0]
			if (fr) pic = wd.pics.get(fr.pic)
		}
		let path = `/wedit/${wd.name}/img/${img.id}`
		if (clip) {
			path += '/'+ clip.id
			if (pic) {
				path += '/'+ pic.id
				ed.update(pic)
			} else ed.c.clear()
		} else {
			ed.c.clear()
		}
		app.rr.ensure(path)
	}
	editPal() {
		this.pal = this.wd.pal.get(this.img.pal)!
		this.updatePal(this.pal)
	}
	updatePal(pal:Pal) {
		if (this.pal.id != pal.id) return
		const {ed, palv} = this
		palv.update()
		ed.c.stage.bg = ed.color(0)
		ed.repaint()
	}
	updateClip(clip?:Clip) {
		const {clip:old, clipv, prev} = this
		if (!clip || !old || old?.id == clip.id) {
			clipv.update()
			prev.update()
		}
	}
	updatePic(pic:Pic) {
		const {clip, ed, clipv, prev} = this
		if (clip?.seq?.find(fr => fr.pic == pic.id)) {
			clipv.update()
			prev.update()
		}
		if (ed?.img?.id == pic.id)
			ed.repaint()
	}
	close() {
		this.ed.close()
		this.ator.close()
	}
}

export function imgForm(wd:WorldData, s:Partial<Img>, submit:(res:Partial<Img>)=>void) {
	return simpleForm<Img>('Asset', s, !s.id, submit, [
		nameInput(s.name),
		kindSelect(s.kind),
		dimInput(s),
		namedListSelect("pal", "Palette", wd.pal, s.pal, {required:true}),
	])
}
