import h from 'web/html'
import {mount, unmount} from 'web/modal'
import {cssColor} from 'game/color'
import {Tset, TileInfo} from 'game/lvl'
import app from 'app'
import {boolInput, strInput, nameInput, colorInput, simpleForm} from './form'

export interface TilesetViewCtx {
	tset:Tset
	tool:{fg:number, bg:number}
	color(t:number):string
	updateColor():void
}

export class TilesetView {
	label="Tiles"
	group="grid"
	el:HTMLElement
	constructor(public ctx:TilesetViewCtx) {
		this.el = h('section.tileset.inline')
		this.update()
	}
	update():void {
		const {el, ctx} = this
		const s = ctx.tset
		if (!s) {
			h.repl(el, "Kein Tileset")
			return
		}
		h.repl(el,
			h('header', 'Tileset: '+ s.name),
			s.infos.map(info => {
				return h('.color',
					{
						onclick: () => {
							if (ctx.tool.fg != info.tile) {
								ctx.tool.fg = info.tile
								ctx.updateColor()
							}
						},
						oncontextmenu: e => {
							e.preventDefault()
							if (ctx.tool.bg != info.tile) {
								ctx.tool.bg = info.tile
								ctx.updateColor()
							}
						},
						ondblclick: () => {
							mount(tileForm(info, res => {
								app.send("tile.edit", {tileset:s.name,
									tile:info.tile,	...res,
								})
								unmount()
							}))
						},
					},
					h('span', {style:"background-color:"+cssColor(info.color)}),
					h('', info.name),
				)
			}),
			h('', {onclick: () => {
				mount(tileForm({}, res => {
					app.send("tile.edit", {tileset:s.name,
							tile:-1, ...res,
					})
					unmount()
				}))
			}}, 'Hinzufügen'),
		)
	}
}

export function tileForm(s:Partial<TileInfo>, submit:(res:Partial<TileInfo>)=>void) {
	return simpleForm<TileInfo>('Tile', s, !s.tile, submit, [
		nameInput(s.name),
		colorInput(s.color),
		boolInput('block', 'Block', s.block),
		strInput('group', 'Gruppe', s.group),
		strInput('asset', 'Asset', s.asset),
	])
}
