import h from 'web/html'
import {Layout} from 'game/dock'
import {GridEditor, gridEditor} from 'game/editor'
import {toolView} from 'game/tool'
import app from 'app'
import {tilesetView} from './tileset'
import {levelView} from './level'
import {Tile, Level, Tileset, TileMap, tileColor} from './model'


export interface MapEditor extends GridEditor<Tile> {
	el:HTMLElement
	map:TileMap
	lvl?:Level
	updateLevel(lvl:Level):void
	updateColor():void
	updateTiles():void
	stop():void
}

export function mapEditor(m:TileMap, sets:string[], dock:Layout):MapEditor {
	const ed = Object.assign(gridEditor(m,
		t => {
			return m.tileset ? tileColor(m.tileset, t) : 'none'
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
		updateTiles() {
			ed.map.tileset.lookup = undefined
			tilesetv.update()
			toolv.updateColor()
			ed.repaint()
		},
		updateLevel(lvl:Level) {
			ed.lvl = lvl
			ed.update(ed.lvl)
		},
		stop() {
			dock.docks.filter(d =>
				d.label == 'Tools' || d.label == 'Tileset' || d.label == 'Level'
			).forEach(d => dock.del(d))
			ed.close()
		},
	}) as MapEditor
	ed.c.setStage({x:8, y:8, w:m.w, h:m.h, zoom:10, bg:ed.color(0)})
	const ids = Object.keys(m.levels) as any[]
	if (ids.length) {
		ed.lvl = m.levels[ids[0]]
		ed.update(ed.lvl)
	}
	const levelv = levelView(ed)
	const toolv = toolView(ed)
	ed.updateTool = () => toolv.updateTool()
	const tilesetv = tilesetView(ed)
	dock.add({label:'Level', el:levelv.el}, 0)
	dock.add({label:'Tools', el:toolv.el}, 1)
	dock.add({label:'Tileset', el:tilesetv.el}, 2)
	h.repl(ed.el, ed.c.el)
	return ed
}
