import {h, hInput, datalistInput} from 'web/html'
import {mount, unmount} from 'web/modal'
import app from 'app'
import {Asset, AssetInfo, kinds} from './asset'

export function assetSelect(infos:AssetInfo[]) {
	const dl = datalistInput('dl-asset-infos', name => {
		if (name) app.send("asset.open", {name})
	})
	let form = h('form', {style:'display:inline'}, dl.el)
	let details = h('')
	let el = h('section',
		'Asset auswählen oder erstellen: ',
		form,
		details,
	)
	let res = {el, details, infos,
		update(infos:AssetInfo[]) {
			res.infos = infos
			dl.update(infos.map(info => info.name))
			h.repl(details, h('ul', infos.map(info => h('li', {onclick: () =>
				app.send("asset.open", {name:info.name})
			}, info.name +' '+ info.kind))))
		},
		addInfo(info:AssetInfo) {
			let all = res.infos
			all.push(info)
			all.sort((a, b) =>
				a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)
			)
			res.update(all)
		}
	}
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
	res.update(infos)
	return res
}

export function assetForm(a:Partial<Asset>, submit:(res:Partial<Asset>)=>void) {
	a = a || {}
	let name = hInput('', {value:a.name||''})
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
			h('', h('label', "Name"), name),
			h('', h('label', "Art"), kind),
			h('button', 'Neu Anlegen')
		)
	)
}
