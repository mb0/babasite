import {h, hInput, datalistInput} from 'web/html'
import {MapInfo} from './model'
import app from 'app'
import {mount, unmount} from 'web/modal'

export interface MapSelect {
	el:HTMLElement
	update(infos:MapInfo[]):void
}

export function mapSelect():MapSelect {
	const dl = datalistInput('dl-asset-infos', name => {
		if (name) app.send("map.open", {name})
	})
	const form = h('form', {style:'display:inline'}, dl.el)
	form.onsubmit = e => {
		e.preventDefault()
		if (!dl.check()) {
			let name = dl.input.value
			dl.input.value = ""
			mount(mapForm({name}, m => {
				app.send("map.new", m)
				unmount()
			}))
		}
	}
	return {
		el: h('section', 'Map auswählen oder erstellen: ', form),
		update: infos => dl.update(infos.map(info => info.name)),
	}
}

export function mapForm(a:Partial<MapInfo>, submit:(res:Partial<MapInfo>)=>void) {
	a = a || {}
	let name = hInput('', {
		value:a.name?a.name.toLowerCase():'',
		required: true,
		pattern: '[a-z0-9_]+'
	})

	let onsubmit = (e:Event) => {
		e.preventDefault()
		submit({name: name.value})
	}
	return h('section.form',
		h('header', 'Map erstellen'),
		h('form', {onsubmit},
			h('', h('label', "Name"), name,
				h('span.help', 'Kann aus Kleinbuchstaben, Zahlen und Unterstrich bestehen')
			),
			h('button', 'Neu Anlegen')
		)
	)
}
