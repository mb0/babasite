import {Dim} from 'game/geo'
import {cssColor} from 'game/color'
import {Grid as GGrid} from 'game/grid'

export interface Tset {
	id:number
	name:string
	infos:TileInfo[]
	cache?:string[]
}

export interface TileInfo {
	tile:number
	name:string
	color:number
	block:boolean
	group?:string
	asset?:string
}

export interface Lvl extends Dim {
	id:number
	name:string
	tset:number
	grid:number
}

export interface Grid extends GGrid<number> {
	id:number
}

export function tileColor(s:Tset, tile:number) {
	if (!s.cache?.length) {
		const c:string[] = s.cache = []
		s.infos.forEach(n => c[n.tile] = cssColor(n.color))
	}
	return s.cache[tile] || "pink"
}
