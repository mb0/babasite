import {h, hInput} from 'web/html'
import {mount, unmount} from 'web/modal'
import {cssColor} from 'game/color'
import app from 'app'
import {Tile, TileMap, TileInfo} from './model'

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
		const s = ctx.map.tileset
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
							mount(tileForm(info, false, res => {
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
				mount(tileForm({}, true, res => {
					app.send("tile.edit", {tileset:s.name,
							tile:-1, ...res,
					})
					unmount()
				}))
			}}, 'Hinzufügen'),
		)
	}}
	view.update()
	return view
}

function tileForm(s:Partial<TileInfo>, isnew:boolean, submit:(res:Partial<TileInfo>)=>void) {
	let name = hInput('', {value:s.name||''})
	let color = hInput('', {type:'color', value:s.color?cssColor(s.color):'#888888'})
	let block = hInput('', {type:'checkbox', checked:s.block||false})
	let group = hInput('', {value:s.group||''})
	let asset = hInput('', {value:s.asset||''})
	let onsubmit = (e:Event) => {
		e.preventDefault()
		let col = 0
		if (color.value[0]=='#') col = parseInt(color.value.slice(1), 16)
		submit({
			name:name.value,
			color:col,
			block:block.checked,
			group:group.value,
			asset:asset.value,
		})
	}
	return h('section.form',
		h('header', 'Tile '+ (isnew?'erstellen':'ändern')),
		h('form', {onsubmit},
			h('', h('label', "Name"), name),
			h('', h('label', "Color"), color),
			h('', h('label', "Block"), block),
			h('', h('label', "Group"), group),
			h('', h('label', "Asset"), asset),
			h('button', 'Speichern')
		)
	)
}
