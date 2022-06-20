import {ColorCache, newColorCache, cssColor} from 'game/color'
import {Pixel} from './asset'

export type Color = string

export interface Palette {
	name:string
	feat:Feature[]
	cache?:ColorCache<Pixel>
}

export interface Feature {
	name:string
	colors:Color[]
}

export function palColor(pal:Palette, p:Pixel):Color {
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

export function palCssColor(pal:Palette, p:Pixel):string {
	if (!pal.cache)	pal.cache = newColorCache<Pixel>(p => cssColor(parseInt(palColor(pal, p), 16)))
	return pal.cache.color(p)
}
