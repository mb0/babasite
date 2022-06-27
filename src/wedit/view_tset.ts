import h from 'web/html'
import {mount, unmount} from 'web/modal'
import {cssColor} from 'game/color'
import {Tset, TileInfo, Lvl} from 'game/lvl'
import app from 'app'
import {boolInput, strInput, nameInput, colorInput, simpleForm} from './form'
import {BaseDock} from 'game/dock'
import {toolView, ToolView, ToolViewCtx} from 'game/tool'
import {WorldData} from './world'

export interface TsetViewCtx {
	wd:WorldData
	tset:Tset
	ed:ToolViewCtx<number>
	lvl:Lvl
}

export class TsetView extends BaseDock {
	head=h('span', 'Tset')
	group="lvl"
	toolv:ToolView<number>
	constructor(public ctx:TsetViewCtx) {
		super('.tset')
		this.toolv = toolView(ctx.ed)
		const act = (n:string) => {
			if (n == 'tset.sel') mount(tsetSelect(ctx.wd.tset.all(), res => {
				if (ctx.lvl.tset != res.id)
					app.send("lvl.edit", {...ctx.lvl, tset:res.id})
				unmount()
			}))
			else if (n == 'tile.new') mount(tileForm({}, res => {
				app.send("tset.tile", {...res, id:ctx.tset.id, tile:-1})
				unmount()
			}))
		}
		this.menu = {act, list: [
			{name:'tile.new', icon:'plus', label:'Tile hinzufügen'},
			{name:'tset.sel', icon:'swap', label:'Tileset auswählen'},
		]}
		this.update()
	}
	update():void {
		const {el, ctx:{tset, ed}, toolv} = this
		toolv.updateColor()
		this.head.innerText = 'Tset ' + tset.name
		h.repl(el, toolv.el, tset.infos.map(info => h('.color', {
			onclick: () => {
				if (ed.tool.fg != info.tile) {
					ed.tool.fg = info.tile
					toolv.updateColor()
				}
			},
			oncontextmenu: e => {
				e.preventDefault()
				if (ed.tool.bg != info.tile) {
					ed.tool.bg = info.tile
					toolv.updateColor()
				}
			},
			ondblclick: () => {
				mount(tileForm(info, res => {
					app.send("tset.tile", {...res, id:tset.id})
					unmount()
				}))
			}},
			h('span', {style:"background-color:"+cssColor(info.color)}),
			h('', info.name),
		)))
	}
}

function tsetSelect(tsets:Tset[], submit:(ts:Tset)=>void) {
	const el = h('.form',
		h('header', 'Tileset auswählen'),
		h('ul',
			tsets.map(ts => h('li', {onclick:()=> submit(ts)}, ts.name)),
			h('li', {onclick() {
				mount(tsetForm({}, res => {
					app.send("tset.new", res)
					unmount()
				}))
			}}, 'Neues Tileset'),
		)
	)
	app.on("tset.new", submit)
	el.addEventListener('unmount', () => {
		app.off("tset.net", submit)
	})
	return el
}

export function tsetForm(s:Partial<Tset>, submit:(res:Partial<Tset>)=>void) {
	return simpleForm<TileInfo>('Tileset', s, !s.id, submit, [
		nameInput(s.name),
	])
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
