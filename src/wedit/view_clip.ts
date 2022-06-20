import h from 'web/html'
import {Clip, Frame, Pic, Pal, palColor} from 'game/pix'
import app from 'app'
import {WorldData} from './world'
import {strInput, dimInput, simpleForm, boolInput} from './form'
import {gridEach} from 'game/grid'
import {dimBox} from 'game/geo'
import {Canvas, newCanvas} from 'web/canvas'

export class ClipView {
	el = h('#clip-view')
	constructor(public wd:WorldData, public clip:Clip, public pal:Pal, public sel:(p:Pic)=>void) {
		this.update()
	}
	update():void {
		const {wd, clip, pal, sel} = this
		h.repl(this.el, framesView(wd, pal, clip, sel))
	}
}

export function framesView(wd:WorldData, pal:Pal, clip:Clip, sel:(p:Pic)=>void):HTMLElement {
	const bg = palColor(pal, 0)
	return h('', clip.seq.map((fr, idx) => {
		const id = 'frame_'+ clip.name +'_' + idx
		const c = newCanvas(id, clip.w, clip.h, bg)
		c.clear()
		c.el.draggable = true
		c.el.ondragstart = (ev:DragEvent) => {
			const dt = ev.dataTransfer!
			dt.setDragImage(c.el, 0, 0)
			dt.setData("application/x-wedit-pic", wd.name+":"+fr.pic)
		}
		const pic = wd.pics?.get(fr.pic)
		if (pic) {
			paintPic(c, clip, pal, pic)
			c.el.onclick = () => sel(pic)
		}
		return c.el
	}))
}

function paintPic(c:Canvas, clip:Clip, pal:Pal, pic:Pic) {
	gridEach(pic, (p, t) => {
		c.paintPixel(p, palColor(pal, t))
	}, dimBox(clip), 0)
}

export function clipForm(s:Partial<Clip>, submit:(res:Partial<Clip>)=>void) {
	return simpleForm<Clip>('Clip', s, !s.id, submit, [
		strInput('name', 'Name', s.name),
		dimInput(s),
		boolInput('loop', 'Loop'),
	])
}
