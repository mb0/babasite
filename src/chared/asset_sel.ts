import {h, hInput, datalistInput} from 'web/html'
import {mount, unmount} from 'web/modal'
import app from 'app'
import {Asset, AssetInfo, kinds} from './asset'

export interface AssetSelect {
	el:HTMLElement
	update(infos:AssetInfo[]):void
}

export function assetSelect():AssetSelect {
	const dl = datalistInput('dl-asset-infos', name => {
		if (name) app.send("asset.open", {name})
	})
	const form = h('form', {style:'display:inline'}, dl.el)
	form.onsubmit = e => {
		e.preventDefault()
		if (!dl.check()) {
			let name = dl.input.value
			dl.input.value = ""
			mount(assetForm({name}, a => {
				app.send("asset.new", a)
				unmount()
			}))
		}
	}
	return {
		el: h('section', 'Asset auswählen oder erstellen: ', form),
		update: infos => dl.update(infos.map(info => info.name)),
	}
}


export function assetOverview(infos:AssetInfo[]):HTMLElement {
	return h('', h('ul', infos.map(info => h('li', {onclick: () =>
		app.send("asset.open", {name:info.name})
	}, info.name +' '+ info.kind))))
}

export function assetForm(a:Partial<Asset>, submit:(res:Partial<Asset>)=>void) {
	a = a || {}
	let name = hInput('', {
		value:a.name?a.name.toLowerCase():'',
		required: true,
		pattern: '[a-z0-9_]+'
	})

	let kind = h('select', kinds.map(k =>
		h('option', {selected:k.kind==a.kind, value:k.kind}, k.name)
	)) as HTMLInputElement
	let onsubmit = (e:Event) => {
		e.preventDefault()
		submit({name: name.value, kind: kind.value})
	}
	return h('section.form',
		h('header', 'Asset erstellen'),
		h('form', {onsubmit},
			h('', h('label', "Name"), name,
				h('span.help', 'Kann aus Kleinbuchstaben, Zahlen und Unterstrich bestehen')
			),
			h('', h('label', "Art"), kind),
			h('button', 'Neu Anlegen')
		)
	)
}
