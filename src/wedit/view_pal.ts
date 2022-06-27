import {h, hIcon, pickColor} from 'web/html'
import {mount, unmount} from 'web/modal'
import app from 'app'
import {Pal, Feat, Img} from 'game/pix'
import {strInput, simpleForm} from './form'
import {BaseDock} from 'game/dock'
import {ToolView, toolView, ToolViewCtx} from 'game/tool'
import {WorldData} from './world'

export interface PalViewCtx {
	wd:WorldData
	img:Img
	pal:Pal
	ed:ToolViewCtx<number>
}

export class PalView extends BaseDock {
	head=h('span')
	group="img"
	toolv:ToolView<number>
	constructor(public ctx:PalViewCtx, public click?:(idx:number)=>void) {
		super('.pal')
		this.toolv = toolView(ctx.ed)
		const act = (n:string) => {
			if (n == 'pal.sel') mount(palSelect(ctx.wd.pal.all(), res => {
				if (ctx.img.pal != res.id)
					app.send("img.edit", {...ctx.img, pal:res.id})
				unmount()
			}))
			else if (n == 'feat.new') mount(featForm({}, res => {
				app.send("pal.feat", {
					id:ctx.pal.id,
					feat:res.name,
				})
				unmount()
			}))
		}
		this.menu = {act, list:[
			{name:'feat.new', icon:'plus', label:'Merkmal hinzufügen'},
			{name:'pal.sel', icon:'swap', label:'Palette auswählen'},
		]}
		this.update()
	}
	update():void {
		const {ctx:{ed, pal}, click} = this
		this.head.innerText = 'Pal ' + pal.name
		this.toolv.updateColor()
		h.repl(this.el, this.toolv.el, h('', pal.feats.map((feat, f) => h('.color',
			h('label', {onclick: ()=> {
				if (click) click(f)
			}}, feat.name),
			feat.colors.map((_, c) => {
				const pix = f*100+c
				const css = ed.color(pix)
				return h('span', {
					style:"background-color:"+css,
				onclick:()=> {
					ed.tool.fg = pix
					this.toolv.updateColor()
				},
				oncontextmenu:(e)=> {
					e.preventDefault()
					ed.tool.bg = pix
					this.toolv.updateColor()
				},
				ondblclick:()=> {
					pickColor(css, res => {
						app.send("pal.feat", {
							id:pal.id, feat:feat.name,
							idx:c, del:1, ins:[res],
						})
					})
				},
			})}),
			h('a', {onclick:()=> {
				pickColor('#7f7575', res => {
					app.send("pal.feat", {
						id:pal.id, feat:feat.name,
						idx:feat.colors.length, ins:[res],
					})
				})
			}}, hIcon('plus'))
		))))
	}
}

function palSelect(pals:Pal[], submit:(p:Pal)=>void) {
	return h('section.form',
		h('header', 'Palette auswählen'),
		h('span', {onclick() {
			mount(palForm({}, res => {
				app.send("pal.new", res)
				unmount()
			}))
		}}, '[new]'),
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
