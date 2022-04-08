import {h, hInput, datalistInput, pickColor} from 'web/html'
import {mount, unmount} from 'web/modal'
import {app} from '../app'
import {Asset} from './asset'
import {Pixel, Feature, Pallette, cssColor} from './pal'

export interface PalCtx {
	a:Asset
	pals:Pallette[]
	fg:Pixel
	fgcolor:string
}
export interface PalView {
	el:HTMLElement
	update(ctx:PalCtx):void
}
export function palView():PalView {
	const el = h('section.pal.inline')
	const update = (ctx:PalCtx) => {
		let pal = ctx.a.pal
		if (!pal) return null
		h.repl(el, h('header',
				h('label', {onclick() {
					mount(palSelect(ctx.pals, res => {
						app.send("pal.open", {name:res.name})
						unmount()
					}))
				}}, pal.name), ' ',
				h('span', {onclick() {
					mount(palForm(ctx, {}, res => {
						app.send("pal.new", res)
						unmount()
					}))
				}}, '[new]')
			),
			h('', !pal.feat ? "no features" :
				pal.feat.map((feat, f) => h('', h('label', feat.name),
					feat.colors.map((color, c) => h('span', {
						style:"background-color:"+cssColor(color),
						onclick() {
							let pixel = f*100+c
							if (ctx.fg == pixel) return
							ctx.fg = pixel
							ctx.fgcolor = cssColor(color)
						},
						ondblclick() {
							pickColor(cssColor(color), res => {
								app.send("pal.edit", {
									name:pal.name,
									feat:feat.name,
									idx:c, del:1, ins:[res],
								})
							})
						},
					})),
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
	}
	return {el, update}
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

export function palForm(ctx:PalCtx, pal:Partial<Pallette>, submit:(res:PalRes)=>void) {
	const name = hInput('', {value:pal.name||''})
	const dl = datalistInput('dl-pals')
	dl.update(["--"].concat(ctx.pals.map(p => p.name)))
	const onsubmit = (e:Event) => {
		e.preventDefault()
		const pal = ctx.pals.find(p => p.name == dl.input.value)
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
