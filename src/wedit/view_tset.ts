import h from 'web/html'
import {mount, unmount} from 'web/modal'
import {cssColor} from 'game/color'
import {Tset, TileInfo} from 'game/lvl'
import app from 'app'
import {boolInput, strInput, nameInput, colorInput, simpleForm} from './form'
import {BaseDock} from 'game/dock'
import {toolView, ToolView, ToolViewCtx} from 'game/tool'
import {WorldData} from './world'

export interface TsetViewCtx {
	tset:Tset
	ed:ToolViewCtx<number>
}

export class TsetView extends BaseDock {
	head=h('span', 'Tset')
	group="lvl"
	toolv:ToolView<number>
	constructor(public wd:WorldData, public ctx:TsetViewCtx) {
		super('.tset')
		this.toolv = toolView(ctx.ed)
		const act = (n:string) => {
			if (n == 'tset.sel') mount(tsetSelect(wd.tset, res => {
				console.log("TODO test.sel", res)
				unmount()
			}))
			else if (n == 'tile.new') mount(tileForm({}, res => {
				app.send("tile.edit", {
					tileset:ctx.tset.name,
					tile:-1,
					...res,
				})
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
		if (!tset) {
			h.repl(el, "Kein Tileset")
			return
		}
		this.head.innerText = 'Tset ' + tset.name
		h.repl(el,
			toolv.el,
			tset.infos.map(info => {
				return h('.color', {
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
							app.send("tile.edit", {tileset:tset.name,
								tile:info.tile,	...res,
							})
							unmount()
						}))
					}},
					h('span', {style:"background-color:"+cssColor(info.color)}),
					h('', info.name),
				)
			}),
		)
	}
}

function tsetSelect(tsets:Tset[], submit:(ts:Tset)=>void) {
	return h('section.form',
		h('header', 'Tileset auswählen'),
		h('span', {onclick() {
			mount(tsetForm({}, res => {
				app.send("tset.new", res)
				unmount()
			}))
		}}, '[new]'),
		h('ul', tsets.map(ts => h('li', {onclick:()=> submit(ts)}, ts.name))),
	)
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
