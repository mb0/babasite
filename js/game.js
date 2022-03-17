let canvas = document.getElementById("our-canvas")
let ctx = canvas.getContext("2d")

let view = document.getElementById("game-view")
let btns = document.createElement("div")
view.appendChild(btns)

function addButton(name, func) {
    let btn = document.createElement("button")
    btn.type = "button"
    btn.innerText = name
    btn.addEventListener("click", func)
    btns.appendChild(btn)
    return btn
}

addButton("Step", function(e) {
    ws.send("step")
})
addButton("Reset", function(e) {
    ws.send("reset")
})
addButton("Play/Stop", function(e) {
    ws.send("play")
})

function paintAt(x, y, color) {
    ctx.fillStyle = color
    ctx.fillRect(x*10, y*10, 10, 10)
}

function paintMap(map) {
    ctx.fillStyle = "white"
    ctx.fillRect(0,0,800,600)
    for (let y = 0; y < map.h; y++) {
        for (let x = 0; x < map.w; x++) {
            let tile = map.tiles[y*map.w+x]
            if (tile > 0) {
                paintAt(x, y, "green")
            }
        }
    }
}
let map
document.addEventListener("DOMContentLoaded", function() {
    addMsgListener("click", function(msg) {
        let p = msg.data
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
        paintAt(p.x, p.y, color)
    })
    addMsgListener("map", function(msg) {
        map = msg.data
        paintMap(msg.data)
    })
})

canvas.addEventListener("click", function(e) {
	let pos = {
        x: Math.floor((e.pageX - canvas.offsetLeft)/10),
        y: Math.floor((e.pageY - canvas.offsetTop)/10),
    }
    ws.send("click\n"+ JSON.stringify(pos))
})

