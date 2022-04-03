import {app, h} from '../app'
import {mount, unmount} from '../modal'
import {Asset, AssetInfo, kinds} from './asset'

export function assetSelect(infos:AssetInfo[]) {
	let listID = 'dl-asset-infos'
	let list = h('datalist', {id:listID})
	let search = h('input', {type:'text', list:listID}) as HTMLInputElement
	let form = h('form', {style:'display:inline'}, list, search)
	let details = h('')
	let el = h('section',
		'Asset auswählen oder erstellen: ',
		form,
		details,
	)
	let res = {el, details, infos,
		update(infos:AssetInfo[]) {
			res.infos = infos
			h.repl(list, infos.map(info => h('option', info.name)))
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
	let checkInput = () => {
		let name = search.value.trim()
		let info = res.infos.find(info => info.name == name)
		if (!info) return false
		search.value = ""
		app.send("asset.open", {name})
		return true
	}
	search.oninput = () => {
		checkInput()
	}
	form.onsubmit = e => {
		e.preventDefault()
		if (!checkInput()) {
			let name = search.value
			search.value = ""
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
	let name = h('input', {type:'text', value:a.name||''}) as HTMLInputElement
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
