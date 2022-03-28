import {app, h} from './app.js'
import {chat} from './chat.js'
import {newZoomCanvas} from './canvas.js'

let map = null
let listeners = {}
app.addView({name: "gol",
    label: "Game Of Life",
	start(app) {
		chat.start(app)
        let c = newZoomCanvas("our-canvas", 800, 600)
        c.zoom(10)
        app.cont.appendChild(h('#game-view', app.linksFor("gol"),
            c.el,
            h('',
                h('button',{type:'button', onclick:function(e) {
                    app.send("step")
                }}, 'Step'),
                h('button',{type:'button', onclick:function(e) {
                    app.send("reset")
                }}, 'Reset'),
                h('button',{type:'button', onclick:function(e) {
                    app.send("play")
                }}, 'Play/Stop'),
            ),
        ))
		c.el.addEventListener("click", e => {
            let p = c.stagePos(e)
            if (p) app.send("click", p)
        })
        c.init(paintMap)
        listeners = {
            click: p => {
                if (!map) return
                let color = "green"
                let i = p.y*map.w+p.x
                if (map.tiles[i] <= 0) {
                    color = "green"
                    map.tiles[i] = 1
                } else {
                    color = "white"
                    map.tiles[i] = 0
                }
                paintAt(c, p.x, p.y, color)
            },
            map: m => {
                map = m
                c.resize(m.w, m.h)
                paintMap(c)
            },
        }
        app.on(listeners)
	},
	stop() {
		chat.stop()
        app.off(listeners)
	}
})

function paintAt(c, x, y, color) {
    c.ctx.fillStyle = color
    c.ctx.fillRect(x, y, 1, 1)
}

function paintMap(c) {
    c.clear()
    for (let y = 0; y < map.h; y++) {
        for (let x = 0; x < map.w; x++) {
            let tile = map.tiles[y*map.w+x]
            if (tile > 0) {
                paintAt(c, x, y, "green")
            }
        }
    }
}