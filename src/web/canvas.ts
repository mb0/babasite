import h from 'web/html'
import {Pos, Box} from 'game/geo'

export interface Stage extends Box {
	zoom:number
	bg:string
}

export class Canvas {
	el:HTMLCanvasElement
	ctx:CanvasRenderingContext2D
	stage:Stage = {x:0, y:0, w:0, h:0, zoom:1, bg: "white"}
	constructor(id:string, width:number, height:number, public bg?:string) {
		const el = this.el = h('canvas', {id, width, height}) as HTMLCanvasElement
		el.style.backgroundColor = bg || "gray"
		const ctx = this.ctx = el.getContext("2d") as CanvasRenderingContext2D
		ctx.imageSmoothingEnabled = false
	}
	clear():void {
		const {el, ctx, stage, bg} = this
		ctx.resetTransform()
		ctx.fillStyle = bg||"gray"
		ctx.fillRect(0, 0, el.width, el.height)
		ctx.transform(stage.zoom, 0, 0, stage.zoom, stage.x, stage.y)
	}
	setStage(s:Partial<Stage>):Stage {
		return Object.assign(this.stage, s)
	}
	paintPixel(p:Pos, color:string):void {
		const {ctx} = this
		ctx.fillStyle = color
		ctx.fillRect(p.x, p.y, 1, 1)
	}
	paintRect(b:Box, color:string|CanvasGradient):void {
		const {ctx} = this
		ctx.fillStyle = color
		ctx.fillRect(b.x, b.y, b.w, b.h)
	}
}

export type DragHandler = (e:PointerEvent)=>void

export class ZoomCanvas extends Canvas {
	resizeObs?:ResizeObserver
	constructor(id:string, width:number, height:number, bg?:string) {
		super(id, width, height, bg)
	}
	clear() {
		super.clear()
		const {ctx, stage:s} = this
		ctx.lineWidth = 4/s.zoom
		ctx.strokeStyle = "black"
		ctx.strokeRect(0, 0, s.w, s.h)
		ctx.fillStyle = s.bg
		ctx.fillRect(0, 0, s.w, s.h)
	}
	init(repaint:(c:Canvas)=>void):void {
		const {el, stage:s} = this
		this.resizeObs = new ResizeObserver(() => {
			if (el.width != el.clientWidth || el.height != el.clientHeight) {
				el.width = el.clientWidth
				el.height = el.clientHeight
				repaint(this)
			}
		})
		this.resizeObs.observe(el)
		el.addEventListener("wheel", e => {
			const x1 = (e.offsetX-s.x)/s.zoom
			const y1 = (e.offsetY-s.y)/s.zoom
			s.zoom += (e.deltaY < 0 ? 1 : -1)
			if (s.zoom<1) s.zoom = 1
			s.x = Math.round(-x1*s.zoom+e.offsetX)
			s.y = Math.round(-y1*s.zoom+e.offsetY)
			repaint(this)
		})
		el.addEventListener("pointerdown", e => {
			if (e.button != 1) return
			let start = {x:e.offsetX, y:e.offsetY}
			this.startDrag(e.pointerId, e => {
				const p = {x:e.offsetX, y:e.offsetY}
				s.x += Math.round(p.x-start.x)
				s.y += Math.round(p.y-start.y)
				start = p
				repaint(this)
			})
		})

	}
	stop():void {
		this.resizeObs?.disconnect()
	}
	grid(a:number, b:number):void {
		const {ctx, stage:s} = this
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
	}
	stagePos(e:MouseEvent):Pos|null {
		const {stage:s} = this
		const x = Math.floor((e.offsetX-s.x)/s.zoom)
		const y = Math.floor((e.offsetY-s.y)/s.zoom)
		return x >= 0 && x < s.w && y >= 0 && y < s.h ? {x, y} : null
	}
	startDrag(pointer:number, move:DragHandler, done?:DragHandler):void {
		const {el} = this
		el.setPointerCapture(pointer)
		let end = (e:PointerEvent) => {
			el.ongotpointercapture = null
			el.onlostpointercapture = null
			el.onpointermove = null
			el.onpointerup = null
			el.onpointercancel = null
			el.releasePointerCapture(pointer)
			if (done) done(e)
		}
		el.ongotpointercapture = () => {
			el.onlostpointercapture = end
			el.onpointermove = move
			el.onpointerup = end
			el.onpointercancel = end
		}
	}
}
