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
	tset?:Tileset
}

export interface TileMap extends MapInfo {
	levels:Level[]
}

export interface TileInfo {
	tile:Tile
	name:string
	color:number
	cssColor?:string
}

export interface Tileset {
	name:string
	infos:TileInfo[]
	lookup?:{[key:number]:TileInfo}
}

export function tileColor(s:Tileset, tile:number) {
	if (!s.lookup) {
		s.lookup = {}
		s.infos.forEach(info => s.lookup![info.tile] = info)
	}
	const info = s.lookup[tile]
	if (!info) return "yellow"
	if (!info.color) return "pink"
	if (!info.cssColor) info.cssColor = cssColor(info.color)
	return info.cssColor!
}
