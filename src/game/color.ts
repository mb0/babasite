
export interface ColorCache<T> {
	color(t:T):string
	reset():void
}

export function newColorCache<T>(conv:(t:T)=>string):ColorCache<T> {
	const c = new Map<T, string>()
	return {
		color(t) {
			let res = c.get(t)
			if (!res) {
				res = conv(t)
				c.set(t, res)
			}
			return res
		},
		reset() { c.clear() }
	}
}

export function cssColor(c:number):string {
	let s = c.toString(16)
	return '#' + '000000'.slice(s.length) + s
}

