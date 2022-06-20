import {Dim, Box} from 'game/geo'

export interface Prod extends Dim {
	id:number
	name:string
	asset:string
	text:string
}

export interface Item extends Box {
	id:number
	prod:number
	inv:number
	sub:number
}

export interface Inv extends Dim {
	id:number
	items?:Item[]
	sub?:Item
}
