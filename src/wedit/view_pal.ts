import {h, pickColor} from 'web/html'
import {mount, unmount} from 'web/modal'
import app from 'app'
import {Pal, Feat} from 'game/pix'
import {strInput, simpleForm} from './form'

export interface PalViewCtx {
	pal:Pal
	tool:{fg:number, bg:number}
	color(t:number):string
	updateColor():void
}

export class PalView {
	label="Palette"
	group="img"
	el:HTMLElement
	constructor(public ctx:PalViewCtx, public pals:Pal[], public click?:(idx:number)=>void) {
		this.el = h('section.pal.inline')
		this.update()
	}
	update():void {
		const {ctx, pals, click} = this
		h.repl(this.el, h('header',
				h('label', {onclick() {
					mount(palSelect(pals, res => {
						app.send("pal.open", {name:res.name})
						unmount()
					}))
				}}, ctx.pal.name), ' ',
				h('span', {onclick() {
					mount(palForm({}, res => {
						app.send("pal.new", res)
						unmount()
					}))
				}}, '[new]')
			),
			h('', !ctx.pal.feat ? "no features" :
				ctx.pal.feat.map((feat, f) => h('.color',
					h('label', {onclick() {
						if (click) click(f)
					}}, feat.name),
					feat.colors.map((_, c) => {
						const pix = f*100+c
						const css = ctx.color(pix)
						return h('span', {
							style:"background-color:"+css,
						onclick() {
							ctx.tool.fg = pix
							ctx.updateColor()
						},
						oncontextmenu(e) {
							e.preventDefault()
							ctx.tool.bg = pix
							ctx.updateColor()
						},
						ondblclick() {
							pickColor(css, res => {
								app.send("pal.edit", {
									name:ctx.pal.name,
									feat:feat.name,
									idx:c, del:1, ins:[res],
								})
							})
						},
					})}),
					h('span', {onclick() {
						pickColor('#7f7575', res => {
							app.send("pal.edit", {
								name:ctx.pal.name,
								feat:feat.name,
								idx:feat.colors.length,
								ins:[res],
							})
						})
					}}, '[+]')
				)),
				h('span', {onclick() {
					mount(featForm({}, res => {
						app.send("pal.edit", {
							name:ctx.pal.name,
							feat:res.name,
							ins:[],
						})
						unmount()
					}))
				}}, '[+]')
			),
		)
	}
}

function palSelect(pals:Pal[], submit:(p:Pal)=>void) {
	return h('section.form',
		h('header', 'Palette auswählen'),
		h('ul', pals.map(p => h('li', {onclick:()=> submit(p)}, p.name))),
	)
}

export function palForm(s:Partial<Pal>, submit:(res:Partial<Pal>)=>void) {
	return simpleForm<Pal>('Palette', s, !s.id, submit, [
		strInput('name', 'Name', s.name),
	])
}
export function featForm(s:Partial<Feat>, submit:(res:Partial<Feat>)=>void) {
	return simpleForm<Feat>('Merkmal', s, !s.name, submit, [
		strInput('name', 'Name', s.name),
	])
}
