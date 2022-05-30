import {cssColor} from 'game/color'
import {Dim} from 'game/geo'
import {Grid} from 'game/grid'

export type Tile = number

export interface Level extends Grid<Tile> {
	id:number
	name:string
}

export interface MapInfo extends Dim {
	name:string
	tileset:string
}

export interface TileMap extends Dim {
	name:string
	levels:Level[]
	tileset:Tileset
}

export interface TileInfo {
	tile:Tile
	name:string
	color:number
	block?:boolean
	group?:string
	asset?:string
}

export interface Tileset {
	name:string
	infos:TileInfo[]
	lookup?:{[key:number]:string}
}

export function tileColor(s:Tileset, tile:number) {
	if (!s.lookup) {
		s.lookup = {}
		s.infos.forEach(info =>
			s.lookup![info.tile] = !info?.color ? "pink" : cssColor(info.color)
		)
	}
	return s.lookup[tile]
}
