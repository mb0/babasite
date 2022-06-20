import {Pal, Img, Clip, Pic} from 'game/pix'
import {Tset, Lvl, Grid} from 'game/lvl'


export interface Vers {
	major:number
	minor:number
	mod:number
}

export interface WorldData {
	name:string
	vers:Vers
	pal:Pal[]
	img:Img[]
	clip:Clip[]
	tset:Tset[]
	lvl:Lvl[]
	grid?:Grid
	pics?:Map<number,Pic>
}

export interface PicData {
	id:number
	pics:Pic[]
}

export interface Table {
	top:string
	label:string
}

export const namedTables:Table[] = [
	{top:"tset", label:"Tiles"},
	{top:"lvl", label:"Level"},
	{top:"pal", label:"Paletten"},
	{top:"img",label: "Assets"},
	{top:"clip", label:"Clips"},
]

