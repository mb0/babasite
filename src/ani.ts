
// We want:
//  * a single animation loop for multiple animations
//  * add and remove animations independently
//  * pause and resume for each individual animation
//  * individual frame time step per animation but matching tick for same rates
//  * stop a whole group of animations

export interface Animation {
	paused():boolean
	toggle():void
	close():void
}

type FrameFunc = (fn:number)=>boolean|void

// Animator manages an animation frame loop for a group of animations.
export interface Animator {

	// animate calls fun with an increasing frame number beginning with start and returns
	// an animation object, that can be used to pause or stop the animation.
	// the frame number is increased per step in milliseconds.
	animate(step:number, fun:FrameFunc, start?:number, paused?:boolean):Animation

	// close stops and removes all animations
	close():void
}

interface Task {
	step:number
	func:FrameFunc
	pause:boolean
	sn:number
	fn:number
}

export function newAnimator():Animator {
	let run = false
	// requestAnimation frame gives us timestamp since page load
	// we keep track of the first timestamp we receive
	let fst = -1
	const tasks:Task[] = []
	const drop = (t:Task) => {
		const idx = tasks.indexOf(t)
		if (idx >= 0) {
			tasks.splice(idx, 1)
			run = !!tasks.find(t => !t.pause)
		}
	}
	const f = (ts:number) => {
		if (!run) return
		if (fst < 0) fst = ts // set first ts
		ts -= fst // now ts is in milliseconds since first call
		tasks.filter(t => {
			 // remember old and set a new step number
			const old = t.sn
			t.sn = Math.floor(ts/t.step)
			if (t.pause || t.sn <= old) return false
			if (old >= 0) t.fn += t.sn-old
			return t.func(t.fn) === false
		}).forEach(drop)
		req()
	}
	const req = () => {
		run = true
		requestAnimationFrame(f)
	}
	return {
		animate(step, func, start, pause) {
			const t = {step, func, pause:!!pause, sn:-1, fn:start||0}
			tasks.push(t)
			if (!run&&!pause) req()
			return {
				paused() { return !!t.pause },
				toggle() {
					t.pause = !t.pause
					if (t.pause) run = !!tasks.find(t => !t.pause)
					else if (!run) req()
				},
				close() { drop(t) },
			}
		},
		close() {
			run = false
			tasks.length = 0
		},
	}
}
