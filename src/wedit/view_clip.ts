import h, {hIcon} from 'web/html'
import {mount, unmount} from 'web/modal'
import {Clip, Frame, Pic, Pal, palColor} from 'game/pix'
import {WorldData} from './world'
import {strInput, dimInput, simpleForm, boolInput, numInput} from './form'
import {gridEach} from 'game/grid'
import {dimBox} from 'game/geo'
import {Canvas, newCanvas} from 'web/canvas'
import app from 'app'

export class ClipView {
	el = h('#clip-view')
	constructor(public wd:WorldData, public clip:Clip, public pal:Pal) {
		this.update()
	}
	setClip(c:Clip) {
		this.clip = c
		this.update()
	}
	update():void {
		const {wd, clip, pal} = this
		h.repl(this.el, h('.row',
			h('', {onclick: e => {
				e.preventDefault()
				mount(clipForm(this.clip, res => {
					const {id, name, w, h, loop} = res
					app.send('clip.edit', {id, name, w, h, loop})
					unmount()
				}))

			}}, clip.name, h('', clip.w +'x'+clip.h)),
			framesView(wd, pal, clip),
			h('a', {onclick: e => {
				e.preventDefault()
				const {id, seq} = this.clip
				app.send('clip.edit', {id, idx:seq.length, seq:[{}]})
			}}, hIcon('plus')),
		))
	}
}

export function framesView(wd:WorldData, pal:Pal, clip:Clip):HTMLElement {
	const sel = (e:Event, p:Pic) => {
		e.preventDefault()
		app.rr.go(`/wedit/${wd.name}/img/${clip.img}/${clip.id}/${p.id}`)
	}
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
		const pic = wd.pics.get(fr.pic)
		if (pic) {
			paintPic(c, clip, pal, pic)
			c.el.onclick = e => sel(e, pic)
			c.el.oncontextmenu = e => {
				sel(e, pic)
				mount(frameForm(fr, (res, del) => {
					const req:any = {id:clip.id, idx, del:1}
					if (!del) req.seq = [res]
					app.send('clip.edit', req)
					unmount()
				}))
			}
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
export function frameForm(s:Partial<Frame>, submit:(res:Partial<Frame>, del?:boolean)=>void) {
	const dur = numInput("dur", "Dauer", s.dur, {}, "Bild wird 1+Dauer Frames angezeigt.")
	let onsubmit = (e:Event) => {
		e.preventDefault()
		dur.write(s)
		submit(s, false)
	}
	return h('.form',
		h('header', 'Frame'+ (!s.pic?' erstellen':' ändern')),
		h('form', {onsubmit},
			dur.wrap,
			h('.row.btns',
				h('button', 'Speichern'),
				!s.pic ? null :
					h('button.del', {type:'button', onclick: () => {
						submit(s, true)
					}}, 'Löschen'),
			)
		)
	)
}
