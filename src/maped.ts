import h from 'web/html'
import {newZoomCanvas, Canvas} from 'web/canvas'
import {Pos, Dim} from 'game/geo'
import {cssColor} from 'game/color'
import {newLayout} from 'game/dock'
import {app, chat, menu} from 'app'

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
		const c = newZoomCanvas("maped-canvas", 800, 600)
		c.setStage({x:20, y:30, zoom:8})
		const tiles = h('.tiles')
		c.el.addEventListener("click", e => {
			const p = c.stagePos(e)
			if (!p||!map) return
			const cur = map.tiles[p.y*map.w+p.x]
			if (map && sel != cur)
				app.send("modtile", {x:p.x, y:p.y, tile:sel})
		})
		app.on(this.subs = {
			modtile(p:ModTile) {
				if (map) map.tiles[p.y*map.w+p.x] = p.tile
				c.paintPixel(p, tileColor(p.tile))
			},
			map(m:Map) {
				map = m
				renderTileset(m.tileset, tiles)
				c.setStage({w:m.w, h:m.h})
				paintMap(c)
			},
		})
		const chatel = chat.start(app)
		const dock = newLayout('#maped', menu(), c.el)
		dock.add({label:'Kacheln', el:tiles})
		dock.add({label:'Chat', el:chatel})
		c.init(paintMap)
		return dock.el
	},
	stop(app) {
		chat.stop(app)
		app.off(this.subs!)
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
