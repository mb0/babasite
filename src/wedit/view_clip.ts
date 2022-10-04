import {h, hIcon} from 'web/html'
import {mount, unmount} from 'web/modal'
import {Img, Clip, Frame, Pic, Pal, palColor} from 'game/pix'
import {WorldData} from './world'
import {strInput, dimInput, simpleForm, boolInput, numInput} from './form'
import {gridEach} from 'game/grid'
import {dimBox} from 'game/geo'
import {Canvas} from 'web/canvas'
import app from 'app'
import {Animator} from 'web/animate'
import {BaseDock} from 'game/dock'
import {imgForm} from './view_img'
import {delForm} from './view_top'

export interface ClipCtx {
	wd:WorldData
	pal:Pal
	img:Img
	clips:Clip[]
	clip?:Clip
	ator:Animator
}

export class ClipView {
	cont = h('details')
	el = h('#clip-view', this.cont)
	last?:Clip
	constructor(public ctx:ClipCtx) {
		this.update()
	}
	update():void {
		const {wd, img, clip, clips, pal} = this.ctx
		if (clip) {
			if (!this.last) (this.cont as HTMLDetailsElement).open = false
			h.repl(this.cont,
				h('summary.drow',
					h('',
						h('', "Clip: "+ (clip.name || "(Ohne Namen)")),
						h('a', {onclick: e => {
							e.preventDefault()
							history.back()
						}}, "Zurück"),
						h('.row', "Dim: "+ clip.w +'x'+clip.h,
							h('a', {onclick: e => {
								e.preventDefault()
								mount(clipForm(wd, clip, res => {
									const {id, name, w, h, loop} = res
									app.send('clip.edit', {id, name, w, h, loop})
									unmount()
								}))

							}}, hIcon('gear')),
						),
					),
					h('.detail', 'Frames:',
						h('a', {onclick: e => {
							e.preventDefault()
							const {id, seq} = clip
							app.send('clip.edit', {id, idx:seq?.length||0, seq:[{}]})
						}}, hIcon('plus')),
					),
					renderFrames(wd, pal, clip),
				),
			)
			h.repl(this.el, this.cont)
		} else {
			h.repl(this.el,
				h('.row',
					"Asset: "+ (img.name || "(Ohne Namen)")+
					" Dim: "+ img.w +'x'+img.h,
					h('a', {onclick: e => {
						e.preventDefault()
						mount(imgForm(wd, img, res => {
							app.send('img.edit', res)
							unmount()
						}))

					}}, hIcon('gear')),
				),
				h('.row', 'Clips',
					h('a', {onclick: e => {
						e.preventDefault()
						mount(clipForm(wd, {img:img.id, w:img.w, h:img.h}, res => {
							app.send("clip.new", res)
							unmount()
						}))
					}}, hIcon('plus')),
				),
				!clips?null:h('', clips.map(c => {
					const name = c.name || '(Ohne Namen)'
					return h('', {style:"display:flex"},
						h('a', {style:'min-width:140px', onclick: e => {
							e.preventDefault()
							app.rr.go(`/wedit/${wd.name}/img/${img.id}/${c.id}`)
						}}, name),
						h('a', {title: "Clip "+ name +" ändern", onclick: (e:Event)=> {
							e.preventDefault()
							mount(clipForm(wd, c, (res:any) => {
								app.send("clip.edit", res)
								unmount()
							}))
						}}, hIcon('gear', {})),
						h('a', {title: "Clip "+ name +" löschen", onclick: (e:Event)=> {
							e.preventDefault()
							mount(delForm("Clip "+ name, "clip", c.id))
						}}, hIcon('close', {})),
					)
				})),
			)
		}
		this.last = clip
	}
}

export function renderFrames(wd:WorldData, pal:Pal, clip:Clip):HTMLElement {
	const sel = (e:Event, p:Pic) => {
		e.preventDefault()
		app.rr.go(`/wedit/${wd.name}/img/${clip.img}/${clip.id}/${p.id}`)
	}
	const bg = palColor(pal, 0)
	return h('.row', clip.seq?.map((fr, idx) => {
		const id = 'frame_'+ clip.name +'_' + idx
		const c = new Canvas(id, clip.w, clip.h, bg)
		c.clear()
		c.el.draggable = true
		c.el.ondragstart = (ev:DragEvent) => {
			const dt = ev.dataTransfer!
			dt.setDragImage(c.el, 0, 0)
			dt.setData("application/x-wedit-pic", wd.name+":"+fr.pic)
		}
		const pic = wd.pics.get(fr.pic)
		const edit = (e:Event) => {
			e.preventDefault()
			if (!pic) return
			sel(e, pic)
			mount(frameForm(fr, (res, del) => {
				const req:any = {id:clip.id, idx, del:1}
				if (!del) req.seq = [res]
				app.send('clip.edit', req)
				unmount()
			}))
		}
		if (pic) {
			paintPic(c, clip, pal, pic)
			c.el.onclick = e => sel(e, pic)
			c.el.oncontextmenu = edit
		}
		return h('.frame', c.el, h('.detail',
			""+((fr.dur||0)+1),
			!pic?null:h('a', {title:"Bild ändern", onclick: edit}, hIcon('gear', {})),
		))
	}))
}

export class ClipPreview extends BaseDock {
	label="Preview"
	group="img"
	c:Canvas
	totals:number[]=[]
	paint:(fn:number)=>void
	constructor(public ctx:ClipCtx) {
		super('.preview')
		const {wd, pal, img:{w:cw, h:ch}} = ctx
		const zoom = 3
		const c = this.c = new Canvas("clip-preview", cw*zoom, ch*zoom)
		h.repl(this.el, c.el)
		c.setStage({zoom})
		this.paint = (fn:number) => {
			c.clear()
			if (!ctx.clip?.seq?.length) return
			const fr = ctx.clip.seq
			if (!fr?.length || this.totals.length != fr.length) this.update()
			const ts = this.totals
			const at = fn%((ts[ts.length-1]||0)+1)
			const idx = ts.findIndex(t => t >= at)
			const pic = wd.pics.get(fr[idx].pic)
			if (pic) paintPic(c, ctx.clip, pal, pic)
		}
		const ani = ctx.ator.animate(100, this.paint, 0, true)
		c.el.onclick = () => ani.toggle()
		this.update()
	}
	update() {
		const {ctx:{clip, pal}, c} = this
		if (clip) {
			c.bg = palColor(pal, 0)
			c.setStage({w:clip.w*c.stage.zoom, h:clip.h*c.stage.zoom})
			this.totals = (clip.seq||[]).reduce((a, fr)=> {
				a.push((a.length?a[a.length-1]:0)+1+(fr.dur||0))
				return a
			}, [] as number[])
		}
		this.paint(0)
	}
}

function paintPic(c:Canvas, clip:Clip, pal:Pal, pic:Pic) {
	gridEach(pic, (p, t) => {
		c.paintPixel(p, palColor(pal, t))
	}, dimBox(clip), 0)
}

export function clipForm(_:WorldData|null, s:Partial<Clip>, submit:(res:Partial<Clip>)=>void) {
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
