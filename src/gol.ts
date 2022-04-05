import {app, h} from './app'
import {chat} from './chat'
import {newZoomCanvas, Canvas} from './canvas'
import {Size} from './geom'

export interface Map extends Size {
	tiles:number[]
}

let map:Map|null = null
app.addView({name: "gol",
	label: "Game Of Life",
	start(app) {
		chat.start(app)
		const c = newZoomCanvas("our-canvas", 800, 600)
		c.zoom(10)
		app.cont.appendChild(h('#game-view', c.el, h('',
			h('button',{type:'button', onclick:() => app.send("step")}, 'Step'),
			h('button',{type:'button', onclick:() => app.send("reset")}, 'Reset'),
			h('button',{type:'button', onclick:() => app.send("play")}, 'Play/Stop'),
		)))
		c.el.addEventListener("click", e => {
			const p = c.stagePos(e)
			if (p) app.send("click", p)
		})
		c.init(paintMap)
		this.listen = {
			click(p) {
				if (!map) return
				let color = "green"
				const i = p.y*map.w+p.x
				if (map.tiles[i] <= 0) {
					color = "green"
					map.tiles[i] = 1
				} else {
					color = "white"
					map.tiles[i] = 0
				}
				c.paintPixel(p, color)
			},
			map(m) {
				map = m
				c.resize(m.w, m.h)
				paintMap(c)
			},
		}
	},
	stop() {
		chat.stop()
	}
})

function paintMap(c:Canvas) {
	c.clear()
	if (!map) return
	for (let y = 0; y < map.h; y++) {
		for (let x = 0; x < map.w; x++) {
			let tile = map.tiles[y*map.w+x]
			if (tile > 0) {
				c.paintPixel({x, y}, "green")
			}
		}
	}
}
