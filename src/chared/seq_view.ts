import {app, h} from '../app'
import {mount, unmount} from '../modal'
import {Asset, Sequence, kinds} from './asset'
import {AssetEditor} from './asset_editor'

export function sequenceView(a:Asset) {
	const picSel = picSelect()
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
		), cont, picSel.el,
	)
	return {el, update(ed:AssetEditor) {
		const {seq} = ed.a
		if (!seq) return "Keine Sequenzen"
		h.repl(cont, seq.map(s => h('span', {onclick() {
			ed.sel(s, 0)
		}}, s.name)))
		picSel.update(ed)
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
