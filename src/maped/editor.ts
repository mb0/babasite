import h from 'web/html'
import {Layout} from 'game/dock'
import {GridEditor, gridEditor} from 'game/editor'
import {toolView} from 'game/tool'
import app from 'app'
import {tilesetView} from './tileset'
import {Tile, Level, Tileset, TileMap, tileColor} from './model'


export interface MapEditor extends GridEditor<Tile> {
	el:HTMLElement
	map:TileMap
	lvl?:Level
	updateColor():void
	stop():void
}

export function mapEditor(m:TileMap, sets:Tileset[], dock:Layout):MapEditor {
	const ed = Object.assign(gridEditor(m,
		t => {
			return m.tset ? tileColor(m.tset, t) : 'none'
		},
		edit => {
			app.send("level.edit", {
				...edit,
				id:ed.lvl?.id,
			})
			ed.tmp.reset()
		},
	), {
		el: h('.map-editor'), map:m,
		updateColor() {
			toolv.updateColor()
		},
		stop() {
			dock.docks.filter(d =>
				d.label == 'Tools' || d.label == 'Tileset'
			).forEach(d => dock.del(d))
			ed.close()
		},
	}) as MapEditor
	ed.c.setStage({x:8, y:8, w:m.w, h:m.h, zoom:10, bg:ed.color(0)})
	const ids = Object.keys(m.levels) as any[]
	if (ids.length) {
		ed.update(m.levels[ids[0]])
	}
	const toolv = toolView(ed)
	ed.updateTool = () => toolv.updateTool()
	const tilesetv = tilesetView(ed)
	dock.add({label:'Tools', el:toolv.el}, 0)
	dock.add({label:'Tileset', el:tilesetv.el}, 1)
	h.repl(ed.el, ed.c.el)
	return ed
}
