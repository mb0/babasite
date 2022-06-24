
export type Sub = (data:any, subj:string)=>void
export type Subs = {[key:string]:Sub}

export class Hub {
	readonly subs:{[key:string]:Sub[]} = {}
	constructor() {}
	on(subj:string|Subs, sub?:Sub):void {
		if (typeof subj == "string") {
			const ss = this.subs
			let list = ss[subj] || (ss[subj] = [])
			list.push(sub!)
		} else {
			Object.keys(subj).forEach(key => this.on(key, subj[key]))
		}
	}
	off(subj:string|Subs, sub?:Sub):void {
		if (typeof subj == "string") {
			const ss = this.subs
			const list = ss[subj]
			if (list) ss[subj] = list.filter(f => f != sub)
		} else {
			Object.keys(subj).forEach(key => this.off(key, subj[key]))
		}
	}
	one(subj:string, sub:Sub):void {
		const f = (data:any, subj:string) => {
			sub(data, subj)
			this.off(subj, f)
		}
		this.on(subj, f)
	}
	trigger(subj:string, data?:any):void {
		this.subs[subj]?.forEach(f => f(data, subj))
	}
}
