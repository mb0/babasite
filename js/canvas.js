import {h} from './app.js'

export function newZoomCanvas(id, width, height, bg) {
    let s = {x:0, y:0, w:0, h:0, zoom:1, bg: bg||"gray"}
    let el = h('canvas', {id, width, height})
    let ctx = el.getContext("2d")
    ctx.imageSmoothingEnabled = false
    let c
    return c = {el, ctx, stage:s,
        move: (x, y) => {
            s.x = x
            s.y = y
        },
        zoom: (v) => {
            s.zoom = v
        },
        resize: (w, h) => {
            s.w = w
            s.h = h
        },
        clear: () => {
            ctx.resetTransform()
            ctx.fillStyle = s.bg
            ctx.fillRect(0, 0, el.width, el.height)
            ctx.transform(s.zoom, 0, 0, s.zoom, s.x, s.y)
            ctx.strokeStyle = "black"
            ctx.strokeRect(0, 0, s.w, s.h)
            ctx.fillStyle = "white"
            ctx.fillRect(0, 0, s.w, s.h)
        },
        stagePos: (e) => {
            const x = Math.floor((e.offsetX-s.x)/s.zoom)
            const y = Math.floor((e.offsetY-s.y)/s.zoom)
            return x >= 0 && x < s.w && y >= 0 && y < s.h ? {x, y} : null
        },
        init: (repaint) => {
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
        startDrag: (move) => {
            let end = () => {
                c.el.removeEventListener("mousemove", move)
                c.el.removeEventListener("mouseup", end)
                c.el.removeEventListener("mouseleave", end)
            }
            c.el.addEventListener("mousemove", move)
            c.el.addEventListener("mouseup", end)
            c.el.addEventListener("mouseleave", end)
        }
    }
}

export function cssColor(c) {
    let s = c.toString(16)
    return '#' + '000000'.slice(s.length) + s
}