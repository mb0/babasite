import {Dim} from 'game/geo'
import {Pallette} from './pal'
import {Pic, PicID} from './pic'

export const kind:{[kind:string]:string} = {
	char:'Character',
	tile:'Map Tile',
	item:'Item',
}
export const kinds = Object.keys(kind).map(k => ({kind:k, name:kind[k]}))

export interface AssetInfo {
	name:string
	kind:string
}

export interface Sequence {
	name:string
	ids:number[]
}

export interface Asset extends AssetInfo, Dim {
	seq:Sequence[]
	pal:Pallette
	pics:{[id:PicID]:Pic}
}
