import h from 'web/html'
import {Layout} from 'game/dock'
import {GridEditor, gridEditor} from 'game/editor'
import {Lvl, Tset, Grid, tileColor} from 'game/lvl'
import {ToolView, toolView} from 'game/tool'
import app from 'app'
import {WorldData} from './world'
import {TilesetView} from './view_tset'


export class GridView {
	lvl:Lvl
	tset:Tset
	ed:GridEditor<number>
	tool:{fg:number, bg:number}
	tsetv:TilesetView
	toolv:ToolView<number>

	constructor(public wd:WorldData, dock:Layout) {
		const grid = wd.grid!
		const lvl = this.lvl = wd.lvl.find(l => l.grid == grid.id)!
		this.tset = wd.tset.find(t => t.id == lvl!.tset)!
		const ed = this.ed = gridEditor(lvl, t => this.color(t), edit => {
			app.send("grid.edit", {
				...edit,
				id:grid.id,
			})
			ed.tmp.reset()
		})
		this.tool = ed.tool
		ed.c.setStage({x:8, y:8, w:lvl.w, h:lvl.h, zoom:10, bg:ed.color(0)})
		ed.update(grid)
		h.repl(dock.main, ed.c.el)
		this.toolv = toolView(ed)
		const group = 'grid'
		dock.add({label:'Tools', el:this.toolv.el, group}, 1)
		dock.add(this.tsetv = new TilesetView(this), 2)
	}
	updateColor():void {
		this.toolv.updateColor()
	}
	color(t:number):string {
		return tileColor(this.tset, t)
	}
	writeHash():string {
		const {wd, lvl} = this
		return `#wedit/${wd.name}/lvl/${lvl.id}`
	}
}
