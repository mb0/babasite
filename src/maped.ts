import h from 'web/html'
import {newZoomCanvas, cssColor, Canvas} from 'web/canvas'
import {Pos, Dim} from 'game/geo'
import {app} from './app'
import {chat} from './chat'

interface ModTile extends Pos {
	tile:number
}
export interface TileInfo {
	tile:number
	name:string
	color:number
}
export interface Tileset {
	name:string
	infos:TileInfo[]
	lookup?:{[key:number]:TileInfo}
}
export interface Map extends Dim {
	tiles:number[]
	tileset:Tileset
}
let sel = 1
let map:Map|null = null
app.addView({name: "maped",
	label: "Map Editor",
	start(app) {
		chat.start(app)
		const c = newZoomCanvas("our-canvas", 800, 600)
		c.zoom(8)
		c.move(20, 30)
		const tiles = h('')
		h.add(app.cont, h('#maped-view', c.el, tiles))
		c.el.addEventListener("click", e => {
			const p = c.stagePos(e)
			if (!p||!map) return
			const cur = map.tiles[p.y*map.w+p.x]
			if (map && sel != cur)
				app.send("modtile", {x:p.x, y:p.y, tile:sel})
		})
		c.init(paintMap)
		this.subs = {
			modtile(p:ModTile) {
				if (map) map.tiles[p.y*map.w+p.x] = p.tile
				c.paintPixel(p, tileColor(p.tile))
			},
			map(m:Map) {
				map = m
				renderTileset(m.tileset, tiles)
				c.resize(m.w, m.h)
				paintMap(c)
			},
		}
	},
	stop() {
		chat.stop()
	},
})

function renderTileset(s:Tileset, cont:HTMLElement) {
	h.repl(cont,
		h('header', 'Tileset: '+ s.name),
		h('ul', s.infos.map(info => {
			const color = "color:"+tileColor(info.tile)
			return h('li', {style:color}, sel == info.tile ? info.name :
				h('a', {href:'', style:color, onclick: e => {
					e.preventDefault()
					sel = info.tile
					renderTileset(s, cont)
				}}, info.name)
			)
		})),
	)
}

function paintMap(c:Canvas) {
	c.clear()
	if (!map) return
	for (let y = 0; y < map.h; y++) {
		for (let x = 0; x < map.w; x++) {
			c.paintPixel({x,y}, tileColor(map.tiles[y*map.w+x]))
		}
	}
}

function tileColor(tile:number) {
	if (!map) return ""
	const s = map.tileset
	if (!s.lookup) {
		s.lookup = {}
		s.infos.forEach(info => s.lookup![info.tile] = info)
	}
	const info = s.lookup[tile]
	if (!info) return "yellow"
	if (!info.color) return "pink"
	return cssColor(info.color)
}
