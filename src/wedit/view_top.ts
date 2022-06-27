import h from "web/html";
import {topSlots, WorldData} from "./world";

export const topLabels:{[key:string]:string} = {
	img: 'Asset',
	pal: 'Palette',
	tset: 'Tileset',
	lvl: 'Level',
	clip: 'Clip',
}

export class TopicView {
	el=h('.topv')
	constructor(public d:WorldData, public top:string, public id?:number) {
		this.update()
	}
	update() {
		const {el, d, top, id} = this
		const sl = topSlots(d, top)
		const topl = topLabels[top]
		if (!id) {
			h.repl(el, h('h1', topl + ' Übersicht'))
			return
		}
		const o = sl.get(id)
		h.repl(el, h('h1', topl+ ': ' + (o.name || id)))
	}
}
