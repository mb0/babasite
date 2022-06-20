import {Lvl} from 'game/lvl'
import {nameInput, dimInput, namedListSelect, simpleForm} from './form'
import {WorldData} from './world'

export function lvlForm(wd:WorldData, s:Partial<Lvl>, submit:(res:Partial<Lvl>)=>void) {
	return simpleForm<Lvl>('Level', s, !s.id, submit, [
		nameInput(s.name),
		dimInput(s),
		namedListSelect("tset", "Tileset", wd.tset, s.tset, {required:true}),
	])
}
