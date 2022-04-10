import {h, hInput} from 'web/html'
import {mount, unmount} from 'web/modal'
import {Animator} from 'web/animate'
import {Canvas, newCanvas} from 'web/canvas'
import app from 'app'
import {Asset, Sequence, kinds, assetColor} from './asset'
import {AssetEditor} from './asset_editor'
import {cssColor} from './pal'
import {Pic} from './pic'

export function sequenceView(a:Asset, ani:Animator) {
	const picSel = picSelect()
	const seqPrev = sequencePreview(a, ani)
	const k = kinds.find(k => k.kind == a.kind)!
	const cont = h('')
	const el = h('section.seq',
		h('header', k.name +' '+ a.name +' Sequenzen: ',
			h('span', {onclick() {
				mount(sequenceForm({}, s => {
					app.send("seq.new", {name:s.name})
					unmount()
				}))
			}}, '[add]')
		), cont, seqPrev.el, picSel.el,
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

function picSelect() {
	const el = h('')
	return {el, update(ed:AssetEditor) {
		if (!ed.seq) return null
		let s = ed.seq
		let ids:number[] = s.ids || (s.ids = [])
		h.repl(el, h('span', s.name+ ' Pics', h('span', {onclick() {
				mount(picForm({}, r => {
					const id = r.idx < 0 || r.idx >= ids.length ? 0 : ids[r.idx]
					app.send("seq.edit", {
						name:s.name,
						idx:ids.length,
						ins:[id],
						copy:!r.ref,
					})
					unmount()
				}))
			}}, '[add]'), ': ', ids.map((_, i:number) =>
			h('span', {onclick() {
				if (i != ed.idx) ed.goto(s, i)
			}}, i+' ')
		)))
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

function sequencePreview(a:Asset, ator:Animator) {
	const id = 'seqPreview_'+ a.name
	const c = newCanvas(id, a.w, a.h, "white")
	let ed:AssetEditor|null = null
	const paint = (fn:number) => {
		c.clear()
		const ids = ed?.seq?.ids
		if (!ids?.length) return
		const pic = a.pics[ids[fn%ids.length]]
		if (pic) paintPic(c, a, pic)
	}
	const ani = ator.animate(500, paint, 0, true)
	c.el.onclick = () => ani.toggle()
	return {el:c.el, c, update(e:AssetEditor) {
		ed = e
		if (ani.paused()) ani.toggle()
	}}
}

function paintPic(c:Canvas, a:Asset, pic:Pic) {
	const {raw: data} = pic
	if (!data?.length) return
	for (let i = 0; i < data.length; i++) {
		let x = i%pic.w
		let y = (i-x)/pic.w
		x += pic.x
		y += pic.y
		c.paintPixel({x, y}, cssColor(assetColor(a, data[i])))
	}
}
