import h from 'web/html'
import {Layout} from 'game/dock'
import {GridEditor, gridEditor} from 'game/editor'
import {Pal, Img, Clip, Pic, palColor} from 'game/pix'
import app from 'app'
import {WorldData} from './world'
import {kindSelect, nameInput, dimInput, namedListSelect, simpleForm} from './form'
import {ToolView, toolView} from 'game/tool'
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
	constructor(public wd:WorldData, dock:Layout, id:number) {
		this.img = wd.img.find(i => i.id == id)!
		this.pal = wd.pal.find(p => p.id == this.img.pal)!
		this.clips = wd.clip.filter(c => c.img == id)!
		let d = {w:this.img.w, h:this.img.h}
		const ed = this.ed = gridEditor(d, t => palColor(this.pal, t), edit => {
			app.send("pic.edit", {
				...edit,
				img:this.img.id,
				pic:ed.img!.id,
			})
			ed.tmp.reset()
		})
		const [cid, pid] = this.readHash(location.hash)
		if (cid) this.clip = this.clips.find(c => c.id == cid)
		if (!this.clip) this.clip = this.clips[0]
		if (!this.clip) {
			throw new Error("TODO think about img without clip or pic")
		}
		const fst = this.clip
		ed.c.setStage({x:8, y:8, w:fst.w, h:fst.h, zoom:12, bg:ed.color(0)})
		const pic = pid && wd.pics?.get(pid) || wd.pics?.get(fst.seq[0].pic)
		if (pic) ed.update(pic)
		const clipv = new ClipView(wd, fst, this.pal, p => ed.update(p))
		h.repl(dock.main, h('#img-view', clipv.el, ed.c.el))
		dock.add(this.palv = new PalView(this, wd.pal, idx => {
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
	}
	readHash(h:string) {
		const p = h.split('/')
		const {wd, img} = this
		if (p[0] != '#wedit' || p[1] != wd.name || p[2] != 'img' || p[3] != ''+img.id)
			return [0, 0]
		return [parseInt(p[4]||'0'), parseInt(p[5]||'0')]
	}
	writeHash():string {
		let h = `#wedit/${this.wd.name}/img/${this.img.id}`
		if (this.clip) h += '/'+ this.clip.id
		if (this.ed.img) h += '/'+ this.ed.img.id
		return h
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
