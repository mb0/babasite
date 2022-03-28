import {app, h} from './app.js'
import {chat} from './chat.js'
import {newZoomCanvas, cssColor} from './canvas.js'

let sel = 1
let map = null
let listeners = {}
app.addView({name: "maped",
    label: "Map Editor",
	start(app) {
		chat.start(app)
        let c = newZoomCanvas("our-canvas", 800, 600)
        c.zoom(8)
        c.move(20, 30)
		let tiles = h('')
		app.cont.appendChild(h('#maped-view', app.linksFor("maped"), c.el, tiles))
		c.el.addEventListener("click", e => {
            let p = c.stagePos(e)
            if (!p) return
            const cur = map.tiles[p.y*map.w+p.x]
            if (map && sel != cur)
                app.send("modtile", {x:p.x, y:p.y, tile:sel})
        })
        c.init(paintMap)
        listeners = {
            modtile: p => {
                if (map) map.tiles[p.y*map.w+p.x] = p.tile
                paintTile(c, p.x, p.y, p.tile)
            },
            map: m => {
                map = m
                renderTileset(m.tileset, tiles)
                c.resize(map.w, map.h)
                paintMap(c)
            },
        }
        app.on(listeners)
	},
	stop() {
		chat.stop()
        app.off(listeners)
	},
})

function renderTileset(s, cont) {
    cont.innerHTML = ""
    cont.appendChild(h('',
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
    ))
}

function paintMap(c) {
    c.clear()
    for (let y = 0; y < map.h; y++) {
        for (let x = 0; x < map.w; x++) {
            let tile = map.tiles[y*map.w+x]
            paintTile(c, x, y, tile)
        }
    }
}

function paintTile(c, x, y, tile) {
    c.ctx.fillStyle = tileColor(tile)
    c.ctx.fillRect(x, y, 1, 1)
}

function tileColor(tile) {
    const s = map.tileset
    if (!s.lookup) {
        s.lookup = {}
        s.infos.forEach(info => s.lookup[info.tile] = info)
    }
    const info = s.lookup[tile]
    if (!info) return "yellow"
    if (!info.color) return "pink"
    return cssColor(info.color)
}