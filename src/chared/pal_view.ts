import {app, h} from '../app'
import {pickColor} from '../html'
import {mount, unmount} from '../modal'
import {Asset} from './asset'
import {Color, Pixel, Feature, Pallette, cssColor} from './pal'

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
					mount(palForm({}, res => {
						app.send("pal.new", {name:res.name, copy:pal.name})
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

export function palForm(pal:Partial<Pallette>, submit:(res:Partial<Pallette>)=>void) {
	const name = h('input', {type:'text', value:pal.name||''}) as HTMLInputElement
	const onsubmit = (e:Event) => {
		e.preventDefault()
		submit({name: name.value})
	}
	return h('section.form',
		h('header', 'Pallette erstellen'),
		h('form', {onsubmit},
			h('', h('label', "Name"), name),
			h('button', 'Neu Anlegen')
		)
	)
}
export function featForm(feat:Partial<Feature>, submit:(res:Partial<Feature>)=>void) {
	const name = h('input', {type:'text', value:feat.name||''}) as HTMLInputElement
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
