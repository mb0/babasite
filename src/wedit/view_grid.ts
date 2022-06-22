import h from 'web/html'
import {Layout} from 'game/dock'
import {GridEditor, gridEditor} from 'game/editor'
import {Lvl, Tset, tileColor} from 'game/lvl'
import app from 'app'
import {WorldData} from './world'
import {TsetView} from './view_tset'


export class GridView {
	lvl:Lvl
	tset:Tset
	ed:GridEditor<number>
	tool:{fg:number, bg:number}
	tsetv:TsetView

	constructor(public wd:WorldData, dock:Layout) {
		const grid = wd.grid!
		const lvl = this.lvl = wd.lvl.find(l => l.grid == grid.id)!
		this.tset = wd.tset.find(t => t.id == lvl!.tset)!
		const ed = this.ed = gridEditor(lvl, t => tileColor(this.tset, t), edit => {
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
		dock.add(this.tsetv = new TsetView(wd, this), 1)
	}
	writeHash():string {
		const {wd, lvl} = this
		return `#wedit/${wd.name}/lvl/${lvl.id}`
	}
}
