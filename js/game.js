let canvas = document.getElementById("our-canvas")
let ctx = canvas.getContext("2d")

function paintAt(x, y, color) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.rect(x*10, y*10, 10, 10)
    ctx.fill()
}

function paintMap(map) {
    let rows = map.tiles
    for (let y = 0; y < rows.length; y++) {
        let cols = rows[y]
        for (let x = 0; x < cols.length; x++) {
            let tile = cols[x]
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
            if (map.tiles[p.y][p.x] <= 0) {
                color = "green"
                map.tiles[p.y][p.x] = 1
            } else {
                color = "white"
                map.tiles[p.y][p.x] = 0
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

