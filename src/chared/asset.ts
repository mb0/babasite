import {Box, Dim, boxIn, boxGrow} from 'game/geo'
import {Grid, gridTiles, gridEach} from 'game/grid'

export const kind:{[kind:string]:string} = {
	char:'Character',
	tile:'Map Tiles',
	item:'Items',
	icon:'Icons',
}
export const kinds = Object.keys(kind).map(k => ({kind:k, name:kind[k]}))

export type Pixel = number

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
	pal:string
	pics:{[id:PicID]:Pic}
}


export interface Sel extends Grid<Pixel> { }

export type PicID = number
export interface Pic extends Grid<Pixel> { id:PicID }

export function picInit(p:Pic):Pic {
	return Object.assign(p, gridTiles<Pixel>(p, p.raw))
}

export interface EditPic extends Sel {
	pic:PicID
	copy?:boolean
}

export function growPic(p:Grid<Pixel>, o:Box) {
	if (o.w*o.h<=0||boxIn(o, p)) return
	const b = boxGrow(p, o)
	let tmp = gridTiles<Pixel>(b)
	gridEach(p, (p, t) => tmp.set(p, t))
	Object.assign(p, tmp)
}

