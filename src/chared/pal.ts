
export type Color = number
export type Pixel = number

export interface Feature {
	name:string
	colors:Color[]
}

export interface Pallette {
	name:string
	feat:Feature[]
}

export function palColor(pal:Pallette, p:Pixel):Color {
	let c = p%100
	let f = (p-c)/100
	if (!f && c == 99) c = 0
	if (pal.feat?.length) {
		let feat = pal.feat[f]
		if (c < feat?.colors?.length) {
			return feat.colors[c]
		}
	}
	return 0
}

export function cssColor(c:Color):string {
	let s = c.toString(16)
	return '#' + '000000'.slice(s.length) + s
}
