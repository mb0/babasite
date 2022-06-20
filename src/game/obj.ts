import {Box} from 'game/geo'

export interface Obj extends Box {
	id:number
	lvl:number
	asset:string
	info?:Info
	loot?:number
	dia?:number
}

export interface Info {
	name:string
	text:string
}
