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
	pal:Slots<Pal>
	img:Slots<Img>
	clip:Slots<Clip>
	tset:Slots<Tset>
	lvl:Slots<Lvl>
	grid?:Grid
	pics:Map<number,Pic>
}

export function topSlots(wd:WorldData, top:string):Slots<any> {
	return (wd as any)[top] as Slots<any>
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
	{top:"tset", label:"Tileset"},
	{top:"pal", label:"Palette"},
	{top:"lvl", label:"Level"},
	{top:"img",label: "Asset"},
	{top:"clip", label:"Clip"},
]

export interface Top { id:number }

export class Slots<T extends Top> extends Array<T|null> {
	constructor(a?:T[]) {
		super()
		this.load(a)
	}
	load(a?:T[]) {
		if (!a?.length) return
		// we expect the input array to be sorted by ids
		for (let i=0, last=0; i<a.length; i++) {
			const o = a[i]
			if (o.id <= last) throw new Error("input list not sorted")
			last = o.id
			this[o.id-1] = o
		}
	}
	get(id:number):T|null {
		return this[id-1]
	}
	set(id:number, t:T|null) {
		if (id > 0) this[id-1] = t
	}
	one(f:(t:T)=>boolean):T|null {
		return (this as T[]).find(t=>t&&f(t))||null
	}
	all(f?:(t:T)=>boolean):T[] {
		return (this as T[]).filter(t=>t&&(!f||f(t)))
	}
	fmap<R>(f:(t:T)=>R|null):R[] {
		return this.reduce((r, t) => {
			if (t) {
				const v = f(t!)
				if (v) r.push(v)
			}
			return r
		}, [] as R[])
	}
}
