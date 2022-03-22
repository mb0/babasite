import {app, h} from './app.js'
import {chat} from './chat.js'

let sel = 1
let map = null
let listeners = {}
app.addView({name: "maped",
    label: "Map Editor",
	start: function(app) {
		chat.start(app)
		let canvas = h('canvas#our-canvas', {width:800, height:600, style: "background-color:white"})
        let tiles = h('')
		app.cont.appendChild(h('#maped-view', app.linksFor("maped"), canvas, tiles))
		let ctx = canvas.getContext("2d")
		canvas.addEventListener("click", onClick)
        listeners = {
            modtile: p => {
                if (map) map.tiles[p.y*map.w+p.x] = p.tile
                paintTile(ctx, p.x, p.y, p.tile)
            },
            map: m => {
                map = m
                const s = m.tileset
                tiles.innerHTML = ""
                tiles.appendChild(h('',
                    h('header', 'Tileset: '+ s.name),
                    h('ul', s.infos.map(info => {
                        const color = "color:"+tileColor(info.tile)
                        return h('li', {style:color}, sel == info.tile ? info.name :
                            h('a', {href:'', style:color, onclick: e => {
                                e.preventDefault()
                                sel = info.tile
                            }}, info.name)
                        )
                    })),
                ))
                paintMap(ctx)
            },
        }
        app.on(listeners)
	},
	stop: function() {
		chat.stop()
        app.off(listeners)
	},
})

function paintMap(ctx) {
    ctx.fillStyle = "white"
    ctx.fillRect(0,0,800,600)
    for (let y = 0; y < map.h; y++) {
        for (let x = 0; x < map.w; x++) {
            let tile = map.tiles[y*map.w+x]
            paintTile(ctx, x, y, tile)
        }
    }
}

function paintTile(ctx, x, y, tile) {
    ctx.fillStyle = tileColor(tile)
    ctx.fillRect(x*10, y*10, 10, 10)
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
    const hex = info.color.toString(16)
    if (hex.length >= 6) return "#" + hex
    return "#" + ("000000".slice(hex.length)) + hex
}

function onClick(e) {
    const x = Math.floor((e.pageX - e.target.offsetLeft)/10)
    const y = Math.floor((e.pageY - e.target.offsetTop)/10)
    const cur = map.tiles[y*map.w+x]
    if (map && sel != cur)
        app.send("modtile", {x:x, y:y, tile:sel})
}