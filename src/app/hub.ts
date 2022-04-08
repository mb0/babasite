
export type Sub = (data:any, subj:string)=>void
export type Subs = {[key:string]:Sub}

export interface Hub {
	on(subj:string|Subs, func?:Sub):void
	off(subj:string|Subs, func?:Sub):void
	one(subj:string, func:Sub):void
	trigger(subj:string, data?:any):void
}

export function newHub():Hub {
	const subs:{[key:string]:Sub[]} = {}
	const on = (subj:string|Subs, sub?:Sub) => {
		if (typeof subj == "string") {
			let list = subs[subj]
			if (!list) subs[subj] = [sub!]
			else list.push(sub!)
		} else {
			Object.keys(subj).forEach(key => on(key, subj[key]))
		}
	}
	const off = (subj:string|Subs, sub?:Sub) => {
		if (typeof subj == "string") {
			const list = subs[subj]
			if (list) subs[subj] = list.filter(f => f != sub)
		} else {
			Object.keys(subj).forEach(key => off(key, subj[key]))
		}
	}
	return {on, off,
		one(subj, func) {
			const f = (data:any, subj:string) => {
				func(data, subj)
				off(subj, f)
			}
			on(subj, f)
		},
		trigger(subj, data) {
			const list = subs[subj]
			if (list) list.forEach(f => f(data, subj))
		},
	}
}
