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
	tool:{fg:number, bg:number}
	palv:PalView
	toolv:ToolView<number>
	constructor(wd:WorldData, dock:Layout, id:number) {
		const img = this.img = wd.img.find(i => i.id == id)!
		const pal = this.pal = wd.pal.find(p => p.id == img.pal)!
		const clips = this.clips = wd.clip.filter(c => c.img == id)!
		const fst = clips[0]
		const d = {w:fst.w||img.w, h:fst.h||img.h}
		const ed = this.ed = gridEditor(d, t => palColor(pal, t), edit => {
			app.send("pic.edit", {
				...edit,
				img:img.id,
				pic:ed.img!.id,
			})
			ed.tmp.reset()
		})
		this.tool = ed.tool
		ed.c.setStage({x:8, y:8, ...d, zoom:12, bg:ed.color(0)})
		const pic = wd.pics?.get(fst.seq[0].pic)
		if (pic) ed.update(pic)
		const clipv = new ClipView(wd, fst, pal, p => ed.update(p))
		h.repl(dock.main, h('#img-view', clipv.el, ed.c.el))
		const group = 'img'
		
		this.toolv = toolView(ed)
		dock.add({label:'Tools', el:this.toolv.el, group}, 1)
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
		}), 2)
	}
	updateColor():void {
		this.toolv.updateColor()
	}
	color(t:number):string {
		return palColor(this.pal, t)
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
