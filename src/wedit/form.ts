import {Dim} from 'game/geo'
import {cssColor} from 'game/color'
import {formID, h, hInput} from 'web/html'
import {kinds} from 'game/pix'
import {WorldData} from './world'

export interface Input {
	el:HTMLElement
	wrap:HTMLElement
	write(to:any):void
}

export function boolInput(key:string, label:string, val?:boolean, opts?:any, help?:string):Input {
	opts = opts||{}
	opts.type = "checkbox"
	let el = hInput('', opts)
	el.checked = val==true
	const wrap = labelWrap(label, el, help)
	return {el, wrap, write: to => to[key] = el.checked}
}
export function strInput(key:string, label:string, val?:string, opts?:any, help?:string):Input {
	opts = opts||{}
	let el = hInput('', opts)
	el.value = val||''
	const wrap = labelWrap(label, el, help)
	return {el, wrap, write: to => to[key] = el.value}
}
export function colorInput(val?:number, opts?:any, help?:string):Input {
	opts = opts||{}
	opts.type = "color"
	let el = hInput('', opts)
	el.value = val != undefined ? cssColor(val) : ''
	const wrap = labelWrap('Color', el, help)
	return {el, wrap, write: to => to.color = parseInt(el.value.slice(1), 16)}
}
export function nameInput(val?:string):Input {
	return strInput('name', 'Name', val, {required:true, pattern:'[a-z0-9_]+'},
		'Kann aus Kleinbuchstaben, Zahlen und Unterstrich bestehen',
	)
}
export function kindSelect(val?:string):Input {
	let el = hInput('select', {required:true})
	h.add(el, kinds.map(k =>
		h('option', {selected:k.kind==val, value:k.kind}, k.name)
	))
	const wrap = labelWrap('Art', el)
	return {el, wrap, write: to => to.kind = el.value}
}
export function namedListSelect(key:string, label:string, list?:object[],
		cur?:number, opts?:object):Input {
	let el = hInput('select', opts||{})
	if (list) h.add(el, list.map((o:any) => {
		return h('option', {selected:o.id==cur, value:o.id}, o.name)
	}))
	const wrap = labelWrap(label, el)
	return {el, wrap, write: to => to[key] = parseInt(el.value, 10)}
}
export function tsetSelect(d:WorldData, cur?:number, opts?:object):Input {
	return namedListSelect("tset", "Tileset", d.tset, cur, opts)
}
export function uintInput(val?:number):HTMLInputElement {
	return hInput('', {value:val||'', required:true, inputMode:'numeric', pattern:'[0-9]+'})
}
export function dimInput(d?:Partial<Dim>):Input {
	const wel = uintInput(d?.w)
	const hel = uintInput(d?.h)
	const el = h('fieldset.dim', {id:formID()}, wel, hel)
	const wrap = labelWrap('Größe Weite x Höhe', el)
	return {el, wrap, write: to => {
		to.w = parseInt(wel.value)
		to.h = parseInt(hel.value)
	}}
}
export function labelWrap(label:string, el:HTMLElement, help?:string) {
	return h('', h('label', {htmlFor:el.id}, label), el, help ? h('span.help', help) : null)
}

export function simpleForm<T>(title:string, s:Partial<T>, isnew:boolean,
		submit:(res:Partial<T>)=>void, list:Input[]):HTMLElement {
	let onsubmit = (e:Event) => {
		e.preventDefault()
		list.forEach(f => f.write(s))
		submit(s)
	}
	return h('section.form',
		h('header', title+ (isnew?' erstellen':' ändern')),
		h('form', {onsubmit},
			list.map(el => el.wrap),
			h('button', 'Speichern')
		)
	)
}
