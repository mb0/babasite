import {h, hInput, datalistInput, pickColor} from 'web/html'
import {mount, unmount} from 'web/modal'
import app from 'app'
import {Pallette, Feature, Pixel, palCssColor} from './pal'

export interface PalView {
	el:HTMLElement
	pal:Pallette
	pals:Pallette[]
	fg:Pixel
	bg:Pixel
	update(pal:Pallette):void
	color(p:Pixel):string
	clickFeat?:(idx:number)=>void
}

export function palView(pal:Pallette, pals:Pallette[]):PalView {
	const el = h('section.pal.inline')
	const view:PalView = {el, pal, pals, fg:1, bg:0, color: (p:Pixel) => {
		return view.pal ? palCssColor(view.pal, p) : ''
	}, update: (pal:Pallette) => {
		view.pal = pal
		h.repl(el, h('header',
				h('label', {onclick() {
					mount(palSelect(view.pals, res => {
						app.send("pal.open", {name:res.name})
						unmount()
					}))
				}}, pal.name), ' ',
				h('span', {onclick() {
					mount(palForm(view.pals, {}, res => {
						app.send("pal.new", res)
						unmount()
					}))
				}}, '[new]')
			),
			h('', !pal.feat ? "no features" :
				pal.feat.map((feat, f) => h('',
					h('label', {onclick() {
						const func = view.clickFeat
						if (func) func(f)
					}}, feat.name),
					feat.colors.map((_, c) => {
						const pix = f*100+c
						const css = view.color(pix)
						return h('span', {
							style:"background-color:"+css,
						onclick() {
							view.fg = pix
						},
						oncontextmenu(e) {
							e.preventDefault()
							view.bg = pix
						},
						ondblclick() {
							pickColor(css, res => {
								app.send("pal.edit", {
									name:pal.name,
									feat:feat.name,
									idx:c, del:1, ins:[res],
								})
							})
						},
					})}),
					h('span', {onclick() {
						pickColor('#7f7575', res => {
							app.send("pal.edit", {
								name:pal.name,
								feat:feat.name,
								idx:feat.colors.length,
								ins:[res],
							})
						})
					}}, '[add]')
				)),
				h('span', {onclick() {
					mount(featForm({}, res => {
						app.send("pal.edit", {
							name:pal.name,
							feat:res.name,
							ins:[],
						})
						unmount()
					}))
				}}, '[new]')
			),
		)
	}}
	view.update(pal)
	return view
}

function palSelect(pals:Pallette[], submit:(p:Pallette)=>void) {
	return h('section.form',
		h('header', 'Pallette auswählen'),
		h('ul', pals.map(p => h('li', {onclick() {
			submit(p)
		}}, p.name))),
	)
}

interface PalRes extends Partial<Pallette> {
	copy:string
}

export function palForm(pals:Pallette[], pal:Partial<Pallette>, submit:(res:PalRes)=>void) {
	const name = hInput('', {value:pal.name||''})
	const dl = datalistInput('dl-pals')
	dl.update(["--"].concat(pals.map(p => p.name)))
	const onsubmit = (e:Event) => {
		e.preventDefault()
		const pal = pals.find(p => p.name == dl.input.value)
		submit({name: name.value, copy: pal?.name||''})
	}
	return h('section.form',
		h('header', 'Pallette erstellen'),
		h('form', {onsubmit},
			h('', h('label', "Name"), name),
			h('', h('label', "Copy"), dl.el),
			h('button', 'Neu Anlegen')
		)
	)
}
export function featForm(feat:Partial<Feature>, submit:(res:Partial<Feature>)=>void) {
	const name = hInput('', {value:feat.name||''})
	const onsubmit = (e:Event) => {
		e.preventDefault()
		submit({name: name.value})
	}
	return h('section.form',
		h('header', 'Merkmal erstellen'),
		h('form', {onsubmit},
			h('', h('label', "Name"), name),
			h('button', 'Neu Anlegen')
		)
	)
}
