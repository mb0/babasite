import {h} from 'web/html'
import {cssColor} from 'game/color'
import {Tile, TileMap} from './model'

export interface TilesetViewCtx {
	map:TileMap
	tool:{fg:Tile, bg:Tile}
	color(t:Tile):string
	updateColor():void
}

export interface TilesetView {
	el:HTMLElement
	ctx:TilesetViewCtx
	update():void
}

export function tilesetView(ctx:TilesetViewCtx):TilesetView {
	const el = h('section.tileset.inline')
	const view:TilesetView = {el, ctx, update:() => {
		const s = ctx.map.tset
		if (!s) {
			h.repl(el, "Kein Tileset")
			return
		}
		h.repl(el,
			h('header', 'Tileset: '+ s.name),
			h('ul', s.infos.map(info => {
				const color = "color:"+cssColor(info.color)
				return h('li', {style:color}, ctx.tool.fg == info.tile ? info.name :
					h('a', {href:'', style:color,
						onclick: e => {
							e.preventDefault()
							ctx.tool.fg = info.tile
							ctx.updateColor()
							view.update()
						},
						oncontextmenu: e => {
							e.preventDefault()
							ctx.tool.bg = info.tile
							ctx.updateColor()
						},
					}, info.name)
				)
			})),
		)
	}}
	view.update()
	return view
}
