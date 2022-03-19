import {app, h} from './app.js'
import {chat} from './chat.js'

let map = null
let listeners = {}
app.addView({
    name: "gol",
	start(app) {
		chat.start(app)
		let canvas = h('canvas#our-canvas', {width:800, height:600, style: "background-color:white"})
        app.cont.appendChild(h('#game-view',
            h('',
                h('button',{type:'button', onclick:function(e) {
                    app.send("enter", {room:"simple"})
                }}, 'Simple')
            ),
            canvas,
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
		let ctx = canvas.getContext("2d")
		canvas.addEventListener("click", onClick)
        listeners = {
            click: p => {
                let color = "green"
                if (map != null) {
                    let i = p.y*map.w+p.x
                    if (map.tiles[i] <= 0) {
                        color = "green"
                        map.tiles[i] = 1
                    } else {
                        color = "white"
                        map.tiles[i] = 0
                    }
                }
                paintAt(ctx, p.x, p.y, color)
            },
            map: m => {
                paintMap(ctx, map = m)
            },
        }
        app.on(listeners)
	},
    on(subj, func) {
        list.push({subj, func})
        app.on(subj, func)
    },
	stop() {
		stop = true
        app.off(listeners)
	}
})

function paintAt(ctx, x, y, color) {
    ctx.fillStyle = color
    ctx.fillRect(x*10, y*10, 10, 10)
}

function paintMap(ctx, map) {
    ctx.fillStyle = "white"
    ctx.fillRect(0,0,800,600)
    for (let y = 0; y < map.h; y++) {
        for (let x = 0; x < map.w; x++) {
            let tile = map.tiles[y*map.w+x]
            if (tile > 0) {
                paintAt(ctx, x, y, "green")
            }
        }
    }
}

function onClick(e) {
    app.send("click", {
        x: Math.floor((e.pageX - e.target.offsetLeft)/10),
        y: Math.floor((e.pageY - e.target.offsetTop)/10),
    })
}

