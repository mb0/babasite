import {h} from './app'

export interface Pos {
	x:number
	y:number
}

export interface Stage extends Pos {
	w:number
	h:number
	zoom:number
	bg:string
}

export type DragHandler = (e:MouseEvent)=>void

export interface ZoomCanvas {
	el:HTMLCanvasElement
	ctx:CanvasRenderingContext2D
	stage:Stage
	move(x:number, y:number):void
	zoom(v:number):void
	resize(w:number, h:number):void
	clear():void
	grid(a:number, b:number):void
	stagePos(e:MouseEvent):Pos|null
	init(repaint:(c:ZoomCanvas)=>void):void
	startDrag(move:DragHandler, done?:DragHandler):void

}

export function newZoomCanvas(id:string, width:number, height:number, bg?:string):ZoomCanvas {
	let s = {x:0, y:0, w:0, h:0, zoom:1, bg: "white"}
	let el = h('canvas', {id, width, height}) as HTMLCanvasElement
	let ctx = el.getContext("2d") as CanvasRenderingContext2D
	ctx.imageSmoothingEnabled = false
	let c:ZoomCanvas
	return c = {el, ctx, stage:s,
		move(x, y) {
			s.x = x
			s.y = y
		},
		zoom(v) {
			s.zoom = v
		},
		resize(w, h) {
			s.w = w
			s.h = h
		},
		clear() {
			ctx.resetTransform()
			ctx.fillStyle = bg||"gray"
			ctx.fillRect(0, 0, el.width, el.height)
			ctx.transform(s.zoom, 0, 0, s.zoom, s.x, s.y)
			ctx.strokeStyle = "black"
			ctx.strokeRect(0, 0, s.w, s.h)
			ctx.fillStyle = s.bg
			ctx.fillRect(0, 0, s.w, s.h)
		},
		grid(a, b) {
			ctx.beginPath()
			ctx.strokeStyle = "black"
			ctx.lineWidth = 1/s.zoom
			for (let x=a; x < s.w; x+=b) {
				ctx.moveTo(x, 0)
				ctx.lineTo(x, s.h)
			}
			for (let y=a; y < s.h; y+=b) {
				ctx.moveTo(0, y)
				ctx.lineTo(s.w, y)
			}
			ctx.stroke()
			ctx.beginPath()
			ctx.lineWidth = 2/s.zoom
			for (let x=b; x < s.w; x+=b) {
				ctx.moveTo(x, 0)
				ctx.lineTo(x, s.h)
			}
			for (let y=b; y < s.h; y+=b) {
				ctx.moveTo(0, y)
				ctx.lineTo(s.w, y)
			}
			ctx.stroke()
		},
		stagePos(e) {
			const x = Math.floor((e.offsetX-s.x)/s.zoom)
			const y = Math.floor((e.offsetY-s.y)/s.zoom)
			return x >= 0 && x < s.w && y >= 0 && y < s.h ? {x, y} : null
		},
		init(repaint) {
			el.addEventListener("wheel", e => {
				s.zoom += (e.deltaY < 0 ? -1 : 1)
				if (s.zoom<1) s.zoom = 1
				repaint(c)
			})
			el.addEventListener("mousedown", e => {
				if (e.button != 1) return
				let start = {x:e.offsetX, y:e.offsetY}
				c.startDrag(e => {
					let p = {x:e.offsetX, y:e.offsetY}
					s.x += p.x-start.x
					s.y += p.y-start.y
					start = p
					repaint(c)
				})
			})
		},
		startDrag(move, done) {
			let end = (e:MouseEvent) => {
				c.el.removeEventListener("mousemove", move)
				c.el.removeEventListener("mouseup", end)
				c.el.removeEventListener("mouseleave", end)
				if (done) done(e)
			}
			c.el.addEventListener("mousemove", move)
			c.el.addEventListener("mouseup", end)
			c.el.addEventListener("mouseleave", end)
		}
	}
}

export function cssColor(c:number):string {
	let s = c.toString(16)
	return '#' + '000000'.slice(s.length) + s
}
