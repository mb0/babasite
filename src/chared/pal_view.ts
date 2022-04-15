import {h, hInput, datalistInput, pickColor} from 'web/html'
import {mount, unmount} from 'web/modal'
import app from 'app'
import {Palette, Feature, Pixel} from './pal'

export interface PalViewCtx {
	pal:Palette
	tool:{fg:Pixel, bg:Pixel}
	color(t:Pixel):string
}

export interface PalView {
	el:HTMLElement
	ctx:PalViewCtx
	pals:Palette[]
	clickFeat(idx:number):void
	update():void
}

export function palView(ctx:PalViewCtx, pals:Palette[], clickFeat:(idx:number)=>void):PalView {
	const el = h('section.pal.inline')
	const view:PalView = {el, ctx, pals, clickFeat, update:() => {
		const pal = ctx.pal
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
						const css = ctx.color(pix)
						return h('span', {
							style:"background-color:"+css,
						onclick() {
							ctx.tool.fg = pix
						},
						oncontextmenu(e) {
							e.preventDefault()
							ctx.tool.bg = pix
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
	view.update()
	return view
}

function palSelect(pals:Palette[], submit:(p:Palette)=>void) {
	return h('section.form',
		h('header', 'Palette auswählen'),
		h('ul', pals.map(p => h('li', {onclick() {
			submit(p)
		}}, p.name))),
	)
}

interface PalRes extends Partial<Palette> {
	copy:string
}

export function palForm(pals:Palette[], pal:Partial<Palette>, submit:(res:PalRes)=>void) {
	const name = hInput('', {value:pal.name||''})
	const dl = datalistInput('dl-pals')
	dl.update(["--"].concat(pals.map(p => p.name)))
	const onsubmit = (e:Event) => {
		e.preventDefault()
		const pal = pals.find(p => p.name == dl.input.value)
		submit({name: name.value, copy: pal?.name||''})
	}
	return h('section.form',
		h('header', 'Palette erstellen'),
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
