import h from 'web/html'
import {Canvas, newZoomCanvas} from 'web/canvas'
import {Dim} from 'game/geo'
import {newLayout} from 'game/dock'
import {app, chat, menu} from 'app'

export interface Map extends Dim {
	tiles:number[]
}

let map:Map|null = null
app.addView({name: "gol",
	label: "Game Of Life",
	start() {
		const c = newZoomCanvas("gol-canvas", 800, 600)
		c.setStage({zoom:10})
		c.el.addEventListener("click", e => {
			const p = c.stagePos(e)
			if (p) app.send("click", p)
		})
		app.on(this.subs = {
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
				c.setStage({w:m.w, h:m.h})
				paintMap(c)
			},
		})
		const tools = h('.tools',
			appAction("Step", "step"),
			appAction("Reset", "reset"),
			appAction("Play/Stop", "play"),
		)
		const chatel = chat.start()
		const dock = newLayout('#gol', menu(), c.el)
		dock.add({label:'Kacheln', el:tools})
		dock.add({label:'Chat', el:chatel, sel:'.dyn'})
		c.init(paintMap)
		return dock.el
	},
	stop() {
		chat.stop()
		app.off(this.subs!)
	}
})

function appAction(label:string, msg:string):HTMLElement {
	return h('button', {type:'button', onclick:() => app.send(msg)}, label)
}

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
