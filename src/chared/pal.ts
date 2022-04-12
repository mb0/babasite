import {ColorCache, newColorCache, cssColor} from 'game/color'

export type Color = number
export type Pixel = number

export interface Feature {
	name:string
	colors:Color[]
}

export interface Palette {
	name:string
	feat:Feature[]
	cache?:ColorCache<Pixel>
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
	return 0
}

export function palCssColor(pal:Palette, p:Pixel):string {
	if (!pal.cache)	pal.cache = newColorCache<Pixel>(p => cssColor(palColor(pal, p)))
	return pal.cache.color(p)
}
