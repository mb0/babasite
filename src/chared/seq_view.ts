import {app, h} from '../app'
import {mount, unmount} from '../modal'
import {Canvas, newCanvas} from '../canvas'
import {Asset, Sequence, kinds, assetColor} from './asset'
import {AssetEditor} from './asset_editor'
import {cssColor} from './pal'
import {Pic} from './pic'

export function sequenceView(a:Asset) {
	const picSel = picSelect()
	const seqPrev = sequencePreview(a)
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
	return {el, stop:seqPrev.stop, update(ed:AssetEditor) {
		const {seq} = ed.a
		if (!seq) return "Keine Sequenzen"
		h.repl(cont, seq.map(s => h('span', {onclick() {
			ed.sel(s, 0)
		}}, s.name)))
		picSel.update(ed)
		seqPrev.update(ed)
	}}
}

function sequenceForm(s:Partial<Sequence>, submit:(res:Partial<Sequence>)=>void) {
	let name = h('input', {type:'text', value:s.name||''}) as HTMLInputElement
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
				app.send("seq.edit", {name:s.name, idx:ids.length, ins:[0]})
			}}, '[add]'), ': ', ids.map((_, i:number) =>
			h('span', {onclick() {
				if (i != ed.idx) ed.sel(s, i)
			}}, i+' ')
		)))
	}}
}

function sequencePreview(a:Asset) {
	const id = 'seqPreview_'+ a.name
	const c = newCanvas(id, a.w, a.h, "white")
	let ed:AssetEditor|null = null
	const stop = () => { ed = null }
	const paint = (tick:number) => {
		if (!ed) return
		const ids = ed.seq?.ids
		if (!ids?.length) return
		const idx = Math.floor(tick/500)%ids.length
		c.clear()
		const pic = a.pics[ids[idx]]
		if (pic) paintPic(c, a, pic)
		requestAnimationFrame(paint)
	}
	return {el:c.el, c, stop, update(e:AssetEditor) {
		ed = e
		paint(0)
	}}
}

function paintPic(c:Canvas, a:Asset, pic:Pic) {
	const {data} = pic
	if (!data?.length) return
	for (let i = 0; i < data.length; i++) {
		let x = i%pic.w
		let y = (i-x)/pic.w
		x += pic.x
		y += pic.y
		c.paintPixel({x, y}, cssColor(assetColor(a, data[i])))
	}
}
