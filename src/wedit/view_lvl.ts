import h from 'web/html'
import {Layout} from 'game/dock'
import {GridEditor} from 'game/editor'
import {Lvl, Tset, tileColor} from 'game/lvl'
import app from 'app'
import {WorldData} from './world'
import {TsetView} from './view_tset'
import {nameInput, dimInput, namedListSelect, simpleForm} from './form'

export class LvlView {
	lvl:Lvl
	tset:Tset
	ed:GridEditor<number>
	tsetv:TsetView

	constructor(public wd:WorldData, dock:Layout) {
		const grid = wd.grid!
		const lvl = this.lvl = wd.lvl.one(l => l.grid == grid.id)!
		this.tset = wd.tset.get(lvl.tset)!
		const ed = this.ed = new GridEditor(lvl, t => tileColor(this.tset, t), edit => {
			app.send("grid.edit", {
				...edit,
				id:lvl.id,
			})
			ed.tmp.reset()
		})
		ed.c.setStage({x:8, y:8, w:lvl.w, h:lvl.h, zoom:10, bg:ed.color(0)})
		ed.update(grid)
		h.repl(dock.main, ed.c.el)
		dock.add(this.tsetv = new TsetView(this), 1)
		ed.updateTool = () => this.tsetv.toolv.updateTool()
		app.rr.ensure(`/wedit/${wd.name}/lvl/${lvl.id}`)
	}
	editTset() {
		this.tset = this.wd.tset.get(this.lvl.tset)!
		this.updateTset(this.tset)
	}
	updateTset(ts:Tset) {
		if (this.tset.id != ts.id) return
		const {ed, tsetv} = this
		tsetv.update()
		ed.c.stage.bg = ed.color(0)
		ed.repaint()
	}
	close() {
		this.ed.close()
	}
}

export function lvlForm(wd:WorldData, s:Partial<Lvl>, submit:(res:Partial<Lvl>)=>void) {
	return simpleForm<Lvl>('Level', s, !s.id, submit, [
		nameInput(s.name),
		dimInput(s),
		namedListSelect("tset", "Tileset", wd.tset, s.tset, {required:true}),
	])
}
