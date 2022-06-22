import h from 'web/html'
import {Layout} from 'game/dock'
import {GridEditor, gridEditor} from 'game/editor'
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
		const lvl = this.lvl = wd.lvl.find(l => l.grid == grid.id)!
		this.tset = wd.tset.find(t => t.id == lvl!.tset)!
		const ed = this.ed = gridEditor(lvl, t => tileColor(this.tset, t), edit => {
			app.send("grid.edit", {
				...edit,
				id:lvl.id,
			})
			ed.tmp.reset()
		})
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

export function lvlForm(wd:WorldData, s:Partial<Lvl>, submit:(res:Partial<Lvl>)=>void) {
	return simpleForm<Lvl>('Level', s, !s.id, submit, [
		nameInput(s.name),
		dimInput(s),
		namedListSelect("tset", "Tileset", wd.tset, s.tset, {required:true}),
	])
}
