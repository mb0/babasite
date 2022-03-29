import {app, h, hReplace} from './app.js'
import {chat} from './chat.js'
import {newZoomCanvas, cssColor} from './canvas.js'
import {mount, unmount} from './modal.js'

let cssStyle = `
.pal span {
    display: inline-block;
    width:40px;
    height:20px;
}
.pal label {
    display: inline-block;
    width:60px;
    height:20px;
}
.tool span + span {
    padding-left: 4px;
}
#chared section {
    border: thin solid black;
}
.inline {
    display: inline-block;
    vertical-align: top;
}
#chared ul {
    list-style: none;
    padding: 0;
}
`
let listeners = {}
app.addView({name: "chared",
    label: "Character Editor",
    start(app) {
        chat.start(app)
        let assets = assetSelect([])
        let cont = h('')
        let ed = null
        app.cont.appendChild(h('#chared',
            h('style', cssStyle), assets.el, cont,
        ))
        listeners = {
            "init": res => {
                assets.update(res.assets)
            },
            "asset.new": res => {
                ed = assetEditor(res)
                assets.addInfo({id:res.id, name:res.name, kind:res.kind})
                hReplace(cont, ed.el)
            },
            "asset.open": res => {
                ed = assetEditor(res)
                hReplace(cont, ed.el)
            },
            "pic.edit": (res, subj) => {
                if (isErr(res, subj) || !ed) return
                // get pic
                let s = ed.a.seq.find(s => s.name == res.seq)
                if (!s) return
                let pic = s.pics[res.pic]
                // update pic
                for (let i=0; i < res.data.length; i++) {
                    let p = res.data[i]
                    if (!p && !res.copy) continue
                    let x = i%res.w
                    let y = (i-x)/res.w
                    pic[y*ed.a.w+x] = p
                }
                // repaint canvas
                ed.repaint()
            },
        }
        app.on(listeners)
    },
    stop() {
        chat.stop()
        app.off(listeners)
    }
})
function isErr(res, subj) {
    if (res&&res.err) {
        console.error("error message: "+ subj, res.err)
        return true
    }
    return false
}
let kinds = [
    {kind:'char', name:'Character'},
    {kind:'tile', name:'Map Tile'},
    {kind:'item', name:'Item'}
]

function assetSelect(infos) {
    let list = h('ul')
    let el = h('section',
        h('header', 'Asset auswählen oder ', h('a', {href:'#', onclick: e => {
            e.preventDefault()
            mount(assetForm({}, a => {
                app.send("asset.new", a)
                unmount()
            }))
        }}, 'neu erstellen')),
        list
    )
    let res = {el,
        update(infos) {
            res.infos = infos
            hReplace(list, infos.map(info => h('li', h('a', {href:'#', onclick: e =>{
            e.preventDefault()
            app.send("asset.open", {id:info.id})
        }}, info.name))))
        },
        addInfo(info) {
            let all = res.infos
            all.push(info)
            all.sort((a, b) => 
                a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)
    )
            res.update(all)
        }
    }
    res.update(infos)
    return res
}

function assetForm(a, submit) {
    a = a || {}
    let name = h('input', {type:'text', value:a.name||''})
    let kind = h('select', kinds.map(k =>
        h('option', {selected:k.kind==a.kind, value:k.kind}, k.name)
    ))
    let onsubmit = e => {
        e.preventDefault()
        submit({name: name.value, kind: kind.value})
    }
    return h('section.form',
        h('header', 'Asset erstellen'),
        h('form', {onsubmit},
            h('', h('label', "Name"), name),
            h('', h('label', "Art"), kind),
            h('button', 'Neu Anlegen')
        )
    )
}

function assetEditor(a) {
    let c = newZoomCanvas("our-canvas", 800, 600)
    c.stage.bg = cssColor(assetColor(a, 0))
    c.zoom(8)
    c.move(8, 8)
    let ed = {a, c, el: h(''),
        seq: null, pic: 0,
        tool:'paint', fg:1, fgcolor:cssColor(assetColor(a, 1)),
        map: new Array(a.w*a.h),
        repaint() {
            c.clear()
            if (!ed.seq) return
            let pic = ed.seq.pics[ed.pic]
            for (let y = 0; y < a.h; y++) {
                for (let x = 0; x < a.w; x++) {
                    let idx = y*a.w+x
                    let p = ed.map[idx] || pic[idx]
                    if (p) {
                        c.ctx.fillStyle = cssColor(assetColor(a, p))
                        c.ctx.fillRect(x, y, 1, 1)
                    }
                }
            }
        }
    }
    if (a.seq && a.seq.length) ed.seq = a.seq[0]
    c.resize(a.w, a.h)
    c.el.addEventListener("mousedown", e => {
        if (e.button != 0) return
            if (ed.tool == 'paint') {
            let paint = e => {
                let p = c.stagePos(e)
                if (!p) return
                ed.map[p.y*a.w+p.x] = ed.fg
                c.ctx.fillStyle = ed.fgcolor
                c.ctx.fillRect(p.x, p.y, 1, 1)
            }
            c.startDrag(paint, e => {
                paint(e)
                if (!ed.map.find(p => !!p)) return
                app.send("pic.edit", {
                    seq:ed.seq.name,
                    pic:ed.pic,
                    w:a.w,
                    h:a.h,
                    data:ed.map,
                })
            })
        }
    })
    c.init(ed.repaint)
    ed.repaint()
    hReplace(ed.el,
        sequenceView(ed),
        // canvas
        c.el,
        // tools and color pallette
        h('', toolView(ed), colorView(ed)),
    )
    return ed
}
function assetColor(a, pixel) {
    let c = pixel%100
    let f = (pixel-c)/100
    if (a && a.pal && a.pal.feat) {
        let feat = a.pal.feat[f]
        if (feat && feat.colors && c < feat.colors.length) {
            return feat.colors[c]
        }
    }
    return 0
}
function sequenceView(ed) {
    let a = ed.a
    return h('section.seq',
        h('header', 'Sequences for '+ a.kind +' '+ a.name),
        h('', !a.seq ? "no sequences" :
            a.seq.map(s => h('span', s.name)),
        )
    )
}
function colorView(ed) {
    let pal = ed.a.pal
    return h('section.pal.inline',
        h('header', 'Pallette: '+ pal.name),
        h('', !pal.feat ? "no features" :
            pal.feat.map((feat, f) => h('', h('label', feat.name),
                feat.colors.map((color, c) => h('span', {
                    style:"background-color:"+cssColor(color),
                    onclick: e => {
                        let pixel = f*100+c
                        if (ed.fg == pixel) return
                        ed.fg = pixel
                        ed.fgcolor = cssColor(color)
                    },
                })),
            )),
            h('span', {onclick: e => {
                console.log("add color")
            }}, '+')
        )
    )
}

function toolView(ed) {
    let tools = [
        {name:'paint'},
        {name:'erase'},
        {name:'select'},
    ]
    return h('section.tool.inline',
        h('header', 'Tools'),
        h('', tools.map(tool => h('span', {onclick: e => {
            ed.tool = tool.name
        }}, tool.name)))
    )
}