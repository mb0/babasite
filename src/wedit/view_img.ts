import h from 'web/html'
import {Layout} from 'game/dock'
import {GridEditor, gridEditor} from 'game/editor'
import {Pal, Img, Clip, Pic, palColor} from 'game/pix'
import app from 'app'
import {WorldData} from './world'
import {kindSelect, nameInput, dimInput, namedListSelect, simpleForm} from './form'
import {PalView} from './view_pal'
import {ClipView} from './view_clip'
import {gridEach, gridSel} from 'game/grid'
import {boxGrow, posIn} from 'game/geo'

export interface PicData {
	id:number
	pics:Pic[]
}

export class ImgView {
	ed:GridEditor<number>
	img:Img
	pal:Pal
	clips:Clip[]
	clip?:Clip
	palv:PalView
	clipv:ClipView
	constructor(public wd:WorldData, dock:Layout, id:number) {
		this.img = wd.img.get(id)!
		this.pal = wd.pal.get(this.img.pal)!
		this.clips = wd.clip.all(c => c.img == id)
		let d = {w:this.img.w, h:this.img.h}
		const ed = this.ed = gridEditor(d, t => palColor(this.pal, t), edit => {
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
		//if (cid) this.clip = this.clips.find(c => c.id == cid)
		if (!this.clip) this.clip = this.clips[0]
		if (!this.clip) {
			throw new Error("TODO think about img without clip or pic")
		}
		const fst = this.clip
		ed.c.setStage({x:8, y:8, w:fst.w, h:fst.h, zoom:12, bg:ed.color(0)})
		const pic = wd.pics.get(fst.seq[0].pic)
		if (pic) ed.update(pic)
		this.clipv = new ClipView(wd, fst, this.pal)
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
				ed.sel = null
			}
			ed.repaint()
		}), 1)
		ed.updateTool = () => this.palv.toolv.updateTool()
	}
	show(clip:Clip, pic?:Pic) {
		this.clip = clip
		this.clipv.setClip(clip)
		const {ed, wd, clipv} = this
		if (!pic) {
			const fr = clip.seq[0]
			if (fr) pic = wd.pics.get(fr.pic)
		}
		clipv.update()
		if (pic) ed.update(pic)
		else ed.c.clear()
	}
	editPal() {
		this.pal = this.wd.pal.get(this.img.pal)!
		this.palv.update()
		this.ed.repaint()
	}
	updatePal(pal:Pal) {
		if (this.pal.id != pal.id) return
		this.palv.update()
		this.ed.repaint()
	}
	updateClip(clip:Clip) {
		const {clip:old, clipv} = this
		if (old?.id == clip.id)
			clipv.update()
	}
	updatePic(pic:Pic) {
		const {clip, ed, clipv} = this
		if (clip?.seq?.find(fr => fr.pic == pic.id))
			clipv.update()
		if (ed?.img?.id == pic.id)
			ed.repaint()
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
