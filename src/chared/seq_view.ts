import {h, hInput} from 'web/html'
import {mount, unmount} from 'web/modal'
import {Animator} from 'web/animate'
import {Canvas, newCanvas} from 'web/canvas'
import {Dim, dimBox} from 'game/geo'
import {gridEach} from 'game/grid'
import app from 'app'
import {Asset, Sequence, Pic, kinds} from './asset'
import {Palette, palCssColor} from './pal'
import {AssetEditor} from './asset_editor'

export function sequenceView(ed:AssetEditor) {
	const picSel = picSelect()
	const k = kinds.find(k => k.kind == ed.a.kind)!
	const cont = h('span')
	const el = h('section.seq',
		h('header', k.name +' '+ ed.a.name +' Sequenzen: ',
			cont,
			h('span', {onclick() {
				mount(sequenceForm({}, s => {
					app.send("seq.new", {name:s.name})
					unmount()
				}))
			}}, '[add]')
		), picSel.el,
	)
	const res = {el, update() {
		const {seq} = ed.a
		if (!seq) return "Keine Sequenzen"
		h.repl(cont, seq.map(s => h('span', {onclick() {
			ed.goto(s, 0)
		}}, s.name)))
		picSel.update(ed)
	}}
	res.update()
	return res
}

function sequenceForm(s:Partial<Sequence>, submit:(res:Partial<Sequence>)=>void) {
	let name = hInput('', {value:s.name||''})
	let onsubmit = (e:Event) => {
		e.preventDefault()
		submit({name: name.value})
	}
	return h('section.form',
		h('header', 'Sequenz erstellen'),
		h('form', {onsubmit},
			h('', h('label', "Name"), name),
			h('button', 'Neu Anlegen')
		)
	)
}

function picSelect(sub?:HTMLElement) {
	const el = h('')
	return {el, update(ed:AssetEditor) {
		if (!ed.seq) return null
		let s = ed.seq
		let ids:number[] = s.ids || (s.ids = [])
		h.repl(el, h('span', s.name+ ' Pics', h('span', {onclick() {
				app.send("seq.edit", {
					name:s.name,
					idx:ids.length,
					ins:[0],
					copy:false,
				})
			}}, '[add]'), ': ',
			h('', sub||null, picViews(ed, s)),
		))
	}}
}
function picViews(ed:AssetEditor, s:Sequence) {
	const bg = ed.color(0)
	return s.ids.map((pid, idx) => {
		const pic = ed.a.pics[pid]
		const id = 'picView_'+ ed.a.name +'_'+ s.name +'_'+ idx
		const c = newCanvas(id, ed.a.w, ed.a.h, bg)
		c.clear()
		c.el.onclick = () => {
			if (idx != ed.idx) ed.goto(s, idx)
		}
		c.el.draggable = true
		c.el.ondragstart = (ev:DragEvent) => {
			const dt = ev.dataTransfer!
			dt.setDragImage(c.el, 0, 0)
			dt.setData("application/x-chared", ed.a.name+":"+pid)
		}
		if (pic) paintPic(c, ed.a, ed.pal, pic)
		return c.el
	})
}

export function sequencePreview(ed:AssetEditor, ator:Animator) {
	const c = newCanvas("seq-preview", ed.a.w, ed.a.h, palCssColor(ed.pal, 0))
	const paint = (fn:number) => {
		c.clear()
		const ids = ed?.seq?.ids
		if (!ids?.length) return
		const pic = ed.a.pics[ids[fn%ids.length]]
		if (pic) paintPic(c, ed!.a, ed!.pal, pic)
	}
	const ani = ator.animate(500, paint, 0, true)
	const update = () => {
		c.el.style.backgroundColor = palCssColor(ed.pal, 0)
		paint(0)
	}
	c.el.onclick = () => ani.toggle()
	update()
	return {el:c.el, c, update}
}

function paintPic(c:Canvas, a:Dim, pal:Palette, pic:Pic) {
	const d = dimBox(a)
	gridEach(pic, (p, t) => {
		c.paintPixel(p, palCssColor(pal, t))
	}, d, 0)
}
