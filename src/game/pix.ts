import {Dim} from 'game/geo'
import {Grid} from 'game/grid'
import {cssColor} from 'game/color'

export const kind:{[kind:string]:string} = {
	char:'Character',
	tile:'Map Tiles',
	item:'Items',
	icon:'Icons',
}
export const kinds = Object.keys(kind).map(k => ({kind:k, name:kind[k]}))

export interface Pal {
	id:number
	name:string
	kind:string
	feat:Feat[]
	cache?:Map<number, string>
}

export interface Feat {
	name:string
	colors:string[]
}

export interface Img extends Dim {
	id:number
	name:string
	kind:string
	pal:number
}

export interface Clip extends Dim {
	id:number
	name:string
	img:number
	seq:Frame[]
	loop:boolean
}

export interface Frame {
	pic:number
	dur:number
}

export interface Pic extends Grid<number> {
	id:number
}

export function palGet(pal:Pal, p:number):string {
	let c = p%100
	let f = (p-c)/100
	if (pal.feat?.length) {
		let feat = pal.feat[f]
		if (c < feat?.colors?.length) {
			return feat.colors[c]
		}
	}
	return ''
}

export function palColor(pal:Pal, p:number):string {
	let c = pal.cache
	if (!c)	{
		c = pal.cache = new Map()
		pal.feat.forEach((feat, fi) => {
			feat.colors.forEach((col, ci) => {
				c!.set(fi*100+ci, cssColor(parseInt(col, 16)))
			})
		})
	}
	return c.get(p)!
}
