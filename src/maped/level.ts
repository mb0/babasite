import {h, hInput} from 'web/html'
import {mount, unmount} from 'web/modal'
import app from 'app'
import {TileMap, Level} from './model'

export interface LevelViewCtx {
	map:TileMap
	lvl?:Level
	updateLevel(lvl:Level):void
}

export interface LevelView {
	el:HTMLElement
	ctx:LevelViewCtx
	update():void
}

export function levelView(ctx:LevelViewCtx):LevelView {
	const cont = h('')
	const el = h('section.level', h('header', 'Levels ',
			h('span', {onclick: () => {
				mount(levelForm({}, true, res => {
					app.send("level.new", res)
					unmount()
				}))
			}}, '[+]'),
		), cont,
	)
	const view:LevelView = {el, ctx, update: ()=>{
		const ids = Object.keys(ctx.map.levels)
		h.repl(cont,
			ids.map((id:any) => {
				const lvl = ctx.map.levels[id]
				return h('', {
					style: 'margin-left: 1em;',
					onclick: () => {
						if (id == ctx.lvl?.id) return
						ctx.updateLevel(lvl)
					},
					ondblclick: () => {
						mount(levelForm(lvl, false, res => {
							app.send("level.rename", {id, name:res.name})
							unmount()
						}))
					}
				}, lvl.name||'(Ohne Namen)')
			}),
		)
	}}
	view.update()
	return view
}

function levelForm(s:Partial<Level>, isnew:boolean, submit:(res:Partial<Level>)=>void) {
	let name = hInput('', {value:s.name||''})
	let onsubmit = (e:Event) => {
		e.preventDefault()
		submit({
			name:name.value,
		})
	}
	return h('section.form',
		h('header', 'Level '+ (isnew?'erstellen':'ändern')),
		h('form', {onsubmit},
			h('', h('label', "Name"), name),
			h('button', 'Speichern')
		)
	)
}
