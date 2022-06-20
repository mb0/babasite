
export interface Dialog {
	id:string
	title:string
	text:string
	choice:Choice[]
}

export interface Choice {
	text:string
	next:number
}
