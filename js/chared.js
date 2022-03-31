import {app, h, hReplace} from './app.js'
import {chat} from './chat.js'
import {newZoomCanvas, cssColor} from './canvas.js'
import {mount, unmount} from './modal.js'

let cssStyle = `
#chared {
    width: calc(98vw - 300px);
}
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
.seq span+span {
    padding-left: 4px;
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
            "seq.new": (res, subj) => {
                if (isErr(res, subj)||!ed) return
                ed.addSeq(res)
            },
            "seq.del": (res, subj) => {
                if (isErr(res, subj)||!ed) return
                ed.delSeq(res.seq)
            },
            "pic.new": (res, subj) => {
                if (isErr(res, subj)||!ed) return
                ed.addPic(res.seq)
            },
            "pic.del": (res, subj) => {
                if (isErr(res, subj)||!ed) return
                ed.delPic(res.seq, res.pic)
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
                    pic[(y+res.y)*ed.a.w+(x+res.x)] = p
                }
                // repaint canvas if current pic
                if (ed.seq == s && ed.pic == res.pic) {
                    ed.repaint()
                }
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
    let listID = 'dl-asset-infos'
    let list = h('datalist', {id:listID})
    let search = h('input', {type:'text', list:listID})
    let form = h('form', {style:'display:inline'}, list, search)
    let el = h('section',
        'Asset auswählen oder erstellen: ',
        form,
    )
    let res = {el,
        update(infos) {
            res.infos = infos
            hReplace(list, infos.map(info => h('option', info.name)))
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
    let checkInput = () => {
        let info = res.infos.find(info => info.name == search.value)
        if (!info) return false
        search.value = ""
        app.send("asset.open", {id:info.id})
        return true
    }
    search.oninput = e => {
        checkInput()
    }
    form.onsubmit = e => {
        e.preventDefault()
        if (!checkInput()) {
            let name = search.value
            search.value = ""
            mount(assetForm({name}, a => {
                app.send("asset.new", a)
                unmount()
            }))
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

function tmpPic(w, h) {
    const data = new Array(w*h)
    let min = {x:w, y:h}
    let max = {x:0, y:0}
    let tmp = {data,
        // reset min, max and map
        reset() {
            for (let y=min.y; y<=max.y; y++) {
                for (let x=min.x; x<=max.x; x++) {
                    data[y*w+x] = 0
                }
            }
            min = {x:w, y:h}
            max = {x:0, y:0}
        },
        paint(x, y, pixel) {
            if (y < min.y) min.y = y
            if (y > max.y) max.y = y
            if (x < min.x) min.x = x
            if (x > max.x) max.x = x
            data[y*w+x] = pixel
        },
        getSel() {
            const sel = {x:min.x, y:min.y, w:1+max.x-min.x, h:1+max.y-min.y, data:null}
            if (sel.w <= 0 || sel.h <= 0) return null
            sel.data = new Array(sel.w*sel.h)
            for (let y=0; y < sel.h; y++) {
                let u = y*sel.w
                let v = (y+min.y)*w
                for (let x=0; x < sel.w; x++) {
                    sel.data[u+x] = data[v+(x+min.x)]
                }
            }
            return sel
        }
    }
    return tmp
}

function renderSeqs(ed) {
    let seq = ed.a.seq
    if (!seq) return "Keine Sequenzen"
    return seq.map(s => 
        h('span', {onclick(e) {
           ed.sel(s, 0) 
        }}, s.name)
    )
}
function renderPics(ed) {
    if (!ed.seq) return null
    let s = ed.seq
    return h('span', s.name+ ' Pics', h('span', {onclick(e) {
            app.send("pic.new", {seq:s.name, pic:s.pics.length})
        }}, '[add]'), ': ', s.pics.map((_, i) => 
        h('span', {onclick(e) {
            if (i != ed.pic) ed.sel(s, i) 
        }}, i+' ')
    ))
}

function assetEditor(a) {
    let c = newZoomCanvas("our-canvas", 800, 600)
    c.resize(a.w, a.h)
    c.zoom(8)
    c.move(8, 8)
    c.stage.bg = cssColor(assetColor(a, 0))
    let tmp = tmpPic(a.w, a.h)
    let seqCont = h('')
    let picsCont = h('')
    let ed = {a, c, el: h(''),
        seq: a.seq && a.seq.length ? a.seq[0] : null, 
        pic: 0,
        tool:'paint', fg:1, fgcolor:cssColor(assetColor(a, 1)),
        repaint() {
            c.clear()
            if (!ed.seq) return
            let pic = ed.seq.pics[ed.pic]
            for (let y = 0; y < a.h; y++) {
                for (let x = 0; x < a.w; x++) {
                    let idx = y*a.w+x
                    let p = tmp.data[idx] || pic[idx]
                    if (p) {
                        c.ctx.fillStyle = cssColor(assetColor(a, p))
                        c.ctx.fillRect(x, y, 1, 1)
                    }
                }
            }
        },
        addSeq(s) {
            // add sequence to asset
            a.seq.push(s)
            hReplace(seqCont, renderSeqs(ed))
            if (!ed.seq) {
                ed.sel(s, 0)
            }
        },
        delSeq(name) {
            // remove sequence from asset
            let idx = a.seq.findIndex(s => s.name == name)
            if (idx >= 0) a.seq.splice(idx, 1)
            hReplace(seqCont, renderSeqs(ed))
            if (ed.seq && ed.seq.name == name) {
                // change selection
                ed.sel(a.seq.length ? a.seq[0] : null, 0)
            }
        },
        addPic(name, pic) {
            // find sequence and add pic
            let s = a.seq.find(s => s.name == name)
            if (!s) return
            s.pics.push(new Array(a.w*a.h))
            if (ed.seq == s) {
                hReplace(picsCont, renderPics(ed))
            }
        },
        delPic(name, pic) {
            // remove pic from asset seq
            let s = ed.a.seq.find(s => s.name == name)
            if (!s) return
            s.pics.splice(pic, 1)
            // if current sequence
            if (ed.seq == s) {
                if (ed.pic == pic) {
                    ed.sel(s, Math.max(0, pic-1), true)
                } else {
                    hReplace(picsCont, renderPics(ed))
                }
            }
        },
        sel(s, pic, force) {
            pic = pic||0
            if (!force && ed.seq == s && ed.pic == pic) return
            ed.seq = s
            ed.pic = pic
            tmp.reset()
            ed.repaint()
            hReplace(picsCont, renderPics(ed))
        },
    }
    c.el.addEventListener("mousedown", e => {
        if (e.button != 0) return
        if (ed.tool == 'paint') {
            let paint = e => {
                let p = c.stagePos(e)
                if (!p) return
                tmp.paint(p.x, p.y, ed.fg)
                c.ctx.fillStyle = ed.fgcolor
                c.ctx.fillRect(p.x, p.y, 1, 1)
            }
            c.startDrag(paint, e => {
                paint(e)
                let sel = tmp.getSel()
                if (!sel) return
                app.send("pic.edit", {
                    seq:ed.seq.name,
                    pic:ed.pic,
                    ...sel,
                })
                tmp.reset()
            })
        }
    })
    c.init(ed.repaint)
    ed.repaint()
    let k = kinds.find(k => k.kind == a.kind)
    hReplace(seqCont, renderSeqs(ed))
    hReplace(picsCont, renderPics(ed))
    hReplace(ed.el,
        h('section.seq',
            h('header', k.name +' '+ a.name +' Sequenzen: ',
                h('span', {onclick(e) {
                    mount(sequenceForm({}, s => {
                        app.send("seq.new", {seq:s.name})
                        unmount()
                    }))
                }}, '[add]')
            ),
            seqCont,
        ),
        picsCont,
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

function sequenceForm(s, submit) {
    s = s || {}
    let name = h('input', {type:'text', value:s.name||''})
    let onsubmit = e => {
        e.preventDefault()
        submit({name: name.value})
    }
    return h('section.form',
        h('header', 'Sequenz erstellen'),
        h('form', {onsubmit},
            h('', h('label', "Name"), name),
            h('button', 'Neu Anlegen')
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