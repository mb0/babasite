import {app, h} from './app'
import {Canvas, newCanvas} from './canvas'
import {chat} from './chat'
import {Pos, Dim} from './geom'

let stop = false
app.addView({name: "simple",
	label: "Sunrise Chat",
	start: function(app) {
		stop = false
		chat.start(app)
		let c = newCanvas('our-canvas', 800, 600, "white")
		h.add(app.cont, h('#simple-view', c.el))
		c.el.addEventListener("click", onClick)
		window.addEventListener("keydown", onKey)
		window.addEventListener("keyup", onKey)
		function step(n:number) {
			drawBackground(c, n)
			if (!stop) requestAnimationFrame(step)
		}
		requestAnimationFrame(step)
	},
	stop: function() {
		chat.stop()
		stop = true
		window.removeEventListener("keydown", onKey)
		window.removeEventListener("keyup", onKey)
	},
})

let car1 = {x:0, y:0}
interface Ctrl {
	up:boolean
	down:boolean
	left:boolean
	right:boolean
}
let ctrl = {up:false, down:false, left:false, right: false}

function random(max:number):number {
	return Math.random()*max
}

interface Cloud extends Pos, Dim {
	v:number
}

let clouds:Cloud[] = []

for (let i=0; i < 20; i++) {
	clouds.push({
		x:random(800),
		y:random(350),
		v:1+random(1),
		w:30+random(20),
		h:10+random(10),
	})
}

function drawClouds(c:Canvas) {
	const color = "rgba(255,255,255,.5)"
	for (let i=0; i < clouds.length; i++) {
		let cloud = clouds[i]
		c.paintRect(cloud, color)
		cloud.x += cloud.v
		if (cloud.x > 800) {
			cloud.w = 30+random(20)
			cloud.h = 10+random(10)
			cloud.x = -cloud.w
			cloud.y = random(350)
		}
	}
}

function drawCar(c:Canvas, car:Pos, ctrl:Ctrl) {
	let v = 10
	if (ctrl.up) car.y -= v
	if (ctrl.down) car.y += v
	if (ctrl.left) car.x -= v
	if (ctrl.right) car.x += v
	car.x = Math.max(0, car.x)
	car.y = Math.max(400, car.y)
	car.x = Math.min(800-20, car.x)
	car.y = Math.min(600-30, car.y)
	c.paintRect({...car, w:20, h:30}, "black")
}

function onKey(e:KeyboardEvent) {
	switch (e.key) {
	case "Up":
	case "ArrowUp":
		ctrl.up = e.type == "keydown"
		break
	case "Down":
	case "ArrowDown":
		ctrl.down = e.type == "keydown"
		break
	case "Right":
	case "ArrowRight":
		ctrl.right = e.type == "keydown"
		break
	case "Left":
	case "ArrowLeft":
		ctrl.left = e.type == "keydown"
		break
	}
}


function wasHit(sun:Sun, mx:number, my:number) {
	let dy = sun.y - my
	let dx = sun.x - mx
	return Math.sqrt(dx*dx + dy*dy) <= sun.rad
}

function wasHitBox(sun:Sun, mx:number, my:number) {
	let x1 = sun.x - sun.rad
	let x2 = sun.x + sun.rad
	let y1 = sun.y - sun.rad
	let y2 = sun.y + sun.rad
	let inX = mx >= x1 && mx <= x2
	let inY = my >= y1 && my <= y2
	return inX && inY
}

interface Sun extends Pos {
	rad:number
}

let sun:Sun = {x: 0, y: 0, rad: 50}

function drawSun({ctx}:Canvas, sun:Sun) {
	ctx.fillStyle = "#FFFF00"
	ctx.beginPath()
	ctx.arc(sun.x, sun.y, sun.rad, 0, 2 * Math.PI)
	ctx.fill()
}
let doDrawSun = true

function drawBackground(c:Canvas, n:number) {
	// male grüne box
	c.paintRect({x:0, y:400, w:800, h:200}, "green")
	// draw blue sky with gradient
	let skyGrad = c.ctx.createLinearGradient(400, 0, 400, 600)
	skyGrad.addColorStop(0, 'blue')
	skyGrad.addColorStop(1, 'white')
	c.paintRect({x:0, y:0, w:800, h:400}, skyGrad)
	drawClouds(c)
	if (doDrawSun) {
		sun.x = ((n / 10) % 900) -50
		let u = (sun.x - 400) / 50
		sun.y = (u * u) + 250
		drawSun(c, sun)
	}
	drawCar(c, car1, ctrl)
}

function onClick(e:MouseEvent) {
	if (doDrawSun) {
		let mx = e.offsetX
		let my = e.offsetY
		//let pix = ctx.getImageData(mx, my, 1, 1).data;
		//let sunhit = pix[0] == 0xff && pix[1] == 0xff
		let sunhit = wasHit(sun, mx, my)
		if (sunhit) {
			console.log("hit the sun")
			doDrawSun = false
		}
	} else {
		doDrawSun = true
	}
}
