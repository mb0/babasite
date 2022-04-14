import {h, hInput} from 'web/html'
import {mount, unmount} from 'web/modal'
import {Animator} from 'web/animate'
import {Canvas, newCanvas} from 'web/canvas'
import {Dim, dimBox} from 'game/geo'
import {gridEach} from 'game/grid'
import app from 'app'
import {Asset, Sequence, kinds} from './asset'
import {Palette, palCssColor} from './pal'
import {Pic} from './pic'
import {AssetEditor} from './asset_editor'

export function sequenceView(a:Asset, pal:Palette, ani:Animator) {
	const seqPrev = sequencePreview(a, pal, ani)
	const picSel = picSelect(seqPrev.el)
	const k = kinds.find(k => k.kind == a.kind)!
	const cont = h('span')
	const el = h('section.seq',
		h('header', k.name +' '+ a.name +' Sequenzen: ',
			cont,
			h('span', {onclick() {
				mount(sequenceForm({}, s => {
					app.send("seq.new", {name:s.name})
					unmount()
				}))
			}}, '[add]')
		), picSel.el,
	)
	return {el, update(ed:AssetEditor) {
		const {seq} = ed.a
		if (!seq) return "Keine Sequenzen"
		h.repl(cont, seq.map(s => h('span', {onclick() {
			ed.goto(s, 0)
		}}, s.name)))
		picSel.update(ed)
		seqPrev.update(ed)
	}}
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
interface PicFormRes {
	idx:number
	ref:boolean
}
function picForm(r:Partial<PicFormRes>, submit:(res:PicFormRes)=>void) {
	let idx = hInput('', {value:''+(r.idx||0)})
	let ref = hInput('', {type:'checkbox', checked:r.ref||false})
	let onsubmit = (e:Event) => {
		e.preventDefault()
		submit({idx: parseInt(idx.value, 10), ref:ref.checked})
	}
	return h('section.form',
		h('header', 'Pic hinzufügen'),
		h('form', {onsubmit},
			h('', h('label', "Starte mit Seq Pic"), idx),
			h('', h('label', "Als Referenz"), ref),
			h('button', 'Neu Anlegen')
		)
	)
}
function picViews(ed:AssetEditor, s:Sequence) {
	const bg = ed.pal.color(0)
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
		if (pic) paintPic(c, ed.a, ed.pal.pal, pic)
		return c.el
	})
}

function sequencePreview(a:Asset, pal:Palette, ator:Animator) {
	const id = 'seqPreview_'+ a.name
	const c = newCanvas(id, a.w, a.h, palCssColor(pal, 0))
	let ed:AssetEditor|null = null
	const paint = (fn:number) => {
		c.clear()
		const ids = ed?.seq?.ids
		if (!ids?.length) return
		const pic = a.pics[ids[fn%ids.length]]
		if (pic) paintPic(c, ed!.a, ed!.pal.pal, pic)
	}
	const ani = ator.animate(500, paint, 0, true)
	c.el.onclick = () => ani.toggle()
	return {el:c.el, c, update(e:AssetEditor) {
		ed = e
		c.el.style.backgroundColor = palCssColor(ed.pal.pal, 0)
		paint(0)
	}}
}

function paintPic(c:Canvas, a:Dim, pal:Palette, pic:Pic) {
	const d = dimBox(a)
	gridEach(pic, (p, t) => {
		c.paintPixel(p, palCssColor(pal, t))
	}, d, 0)
}
