import h from 'web/html'
import {Box, boxIn, boxGrow} from 'game/geo'
import {newLayout} from 'game/dock'
import {Grid, gridTiles, gridSel, gridEach} from 'game/grid'
import {View, app, chat, menu} from 'app'
import {Tile, Level, MapInfo, TileMap, Tileset} from './model'
import {MapEditor, mapEditor} from './editor'
import {MapSelect, mapSelect} from './map_sel'


export interface MapedView extends View {
	infos:MapInfo[]
	sets:string[]
	sel:MapSelect
	ed?:MapEditor|null
}

const v:MapedView = {name: "maped", label: "Map Editor",
	sets: [], infos: [],
	sel: mapSelect(),
	start() {
		app.on(v.subs = {
			"init": res => {
				v.sets = res.tilesets||[]
				v.infos = res.infos||[]
				v.sel.update(v.infos)
				// TODO h.repl(dock.main, mapOverview(this.infos))
				const {hash} = location
				if (hash?.length > 1) {
					const idx = hash.indexOf('/')
					if (idx > 0) {
						const name = hash.slice(idx+1)
						if (name) app.send("map.open", {name})
					}
				}
			},
			"tileset.open": res => {
				// TODO update map tileset and repaint
			},
			"tile.edit": (res, subj) => {
				if (isErr(res, subj)) return
				if (!v.ed) return
				const ts = v.ed.map.tileset
				if (!ts || ts.name != res.tileset) return
				if (res.tile < 0) {
					res.tile = 1+ts.infos.reduce((a,info)=> Math.max(a, info.tile), 0)
					ts.infos.push(res)
				} else {
					const tile = ts.infos.find(info => info.tile == res.tile)
					Object.assign(tile, res)
				}
				v.ed.updateTiles()
			},
			"map.new": (res, subj) => {
				if (isErr(res, subj)) return
				v.infos.push(res as MapInfo)
				v.infos.sort((a, b) => a.name < b.name ? -1 : (a.name > b.name ? 1 : 0))
				v.sel.update(v.infos)
			},
			"map.open": (res:TileMap, subj) => {
				if (isErr(res, subj)) return
				if (v.ed) v.ed.stop()
				// init tileset and levels
				Object.values(res.levels).forEach((lvl:Level) => {
					Object.assign(lvl, gridTiles<Tile>(lvl, lvl.raw))
				})
				v.ed = mapEditor(res, v.sets, dock)
				h.repl(dock.main, v.ed.el)
				location.hash = '#maped/'+ res.name
			},
			"level.edit": (res, subj) => {
				if (isErr(res, subj) || !v.ed) return
				let lvl = v.ed.map.levels[res.id]
				if (!lvl) return
				if (res.repl) {
					const {x, y, w, h} = res
					Object.assign(lvl, {x, y, w, h, raw:Array(w*h).fill(0)})
				} else if (!boxIn(res, lvl)) growLevel(lvl, res)
				if (res.fill !== undefined) {
					if (res.raw?.length) {
						const sel = gridSel(res, res.raw)
						gridEach(sel, p => lvl.set(p, res.fill), lvl, false)
					} else {
						gridEach(lvl, p => lvl.set(p, res.fill), res)
					}
				} else {
					const img = gridTiles<Tile>(res, res.raw)
					gridEach(img, (p, t) => lvl.set(p, t), lvl,
						!res.copy ? 0 : undefined)
				}
				// repaint canvas if pic is active sequence
				if (v.ed.lvl?.id == lvl.id) {
					v.ed.repaint()
				}
			},
		})
		const chatel = chat.start()
		const dock = newLayout('#maped', h('', menu(), v.sel.el), "Wird geladen ...")
		h.add(dock.el, h('style', style))
		dock.add({label:'Chat', el:chatel})
		return dock.el
	},
	stop() {
		chat.stop()
		app.off(v.subs!)
		if (v.ed) v.ed.stop()
	},
}

app.addView(v)

function growLevel(p:Grid<Tile>, o:Box) {
	if (o.w*o.h<=0||boxIn(o, p)) return
	const b = boxGrow(p, o)
	let tmp = gridTiles<Tile>(b)
	gridEach(p, (p, t) => tmp.set(p, t))
	Object.assign(p, tmp)
}

function isErr(res:any, subj:string) {
	if (res&&res.err) {
		console.error("error message: "+ subj, res.err)
		return true
	}
	return false
}

const style = `
.tool span + span {
	padding-left: 4px;
}
form span.help {
	margin-left: 16px;
}
.color span {
	display: inline-block;
	width:40px;
	height:20px;
}
.color div {
	display: inline-block;
	margin-left: 4px;
}
.map-editor {
	max-height: 100%;
	flex: 1 1 0;
	display: flex;
	flex-direction: column;
}
.map-editor #editor-canvas {
	max-width: 100%;
	display:block;
	flex: 1 1 0;
}
`
