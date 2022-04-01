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
                assets.details.style.display = 'block'
                assets.update(res.assets||[])
            },
            "asset.new": (res, subj) => {
                if (isErr(res, subj)) return
                assets.addInfo(res)
            },
            "asset.open": (res, subj) => {
                if (isErr(res, subj)) return
                assets.details.style.display = 'none'
                ed = assetEditor(res)
                hReplace(cont, ed.el)
            },
            "asset.del": res => {
                // TODO
            },
            "seq.new": (res, subj) => {
                if (isErr(res, subj)||!ed) return
                if (res.pics) res.pics.forEach(p => ed.addPic(p))
                ed.addSeq(res)
            },
            "seq.del": (res, subj) => {
                if (isErr(res, subj)||!ed) return
                ed.delSeq(res.name)
            },
            "seq.edit": (res, subj) => {
                if (isErr(res, subj)||!ed) return
                if (res.pics) res.pics.forEach(p => ed.addPic(p))
                let s = ed.a.seq.find(s => s.name == res.name)
                if (!s) return
                let args = [res.idx||0, res.del||0]
                if (res.ins) args = args.concat(res.ins)
                s.ids.splice.apply(s.ids, args)
                ed.updateSeq(s)
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
                let pic = ed.a.pics[res.pic]
                if (!pic) return
                // update pic
                if (!boxContains(pic, res)) growPic(pic, res)
                copySel(pic, res)
                // repaint canvas if current pic
                if (pic == ed.pic) {
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
    let details = h('')
    let el = h('section',
        'Asset auswählen oder erstellen: ',
        form,
        details,
    )
    let res = {el, details, 
        update(infos) {
            res.infos = infos
            hReplace(list, infos.map(info => h('option', info.name)))
            hReplace(details, h('ul', infos.map(info => h('li', {onclick: e =>
                app.send("asset.open", {name:info.name})
            }, info.name +' '+ info.kind))))
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
        let name = search.value.trim()
        let info = res.infos.find(info => info.name == name)
        if (!info) return false
        search.value = ""
        app.send("asset.open", {name})
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
        minmax(x, y) {
            if (y < min.y) min.y = y
            if (y > max.y) max.y = y
            if (x < min.x) min.x = x
            if (x > max.x) max.x = x
        },
        paint(x, y, pixel) {
            tmp.minmax(x, y)
            data[y*w+x] = pixel
        },
        rect(rx, ry, rw, rh, pixel) {
            let x2 = Math.min(rx+rw-1, w-1)
            let y2 = Math.min(ry+rh-1, h-1)
            let x1 = Math.max(rx, 0)
            let y1 = Math.max(ry, 0)
            tmp.minmax(x1, y1)
            tmp.minmax(x2, y2)
            for (let y=y1; y<=y2; y++) {
                for (let x=x1; x<=x2; x++) {
                    data[y*w+x] = pixel
                }
            }
        },
        getSel() {
            const sel = {x:min.x, y:min.y, w:1+max.x-min.x, h:1+max.y-min.y, data:null}
            if (sel.w <= 0 || sel.h <= 0) return null
            sel.data = new Array(sel.w*sel.h).fill(0)
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
    let ids = s.ids || (s.ids = [])
    return h('span', s.name+ ' Pics', h('span', {onclick(e) {
            app.send("seq.edit", {name:s.name, idx:ids.length, ins:[0]})
        }}, '[add]'), ': ', ids.map((_, i) => 
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
    let ed = {a, c, el: h(''), tmp,
        seq: a.seq && a.seq.length ? a.seq[0] : null, 
        idx:0, pic:null,
        tool:'pen', mirror:false, grid:true,
        fg:1, fgcolor:cssColor(assetColor(a, 1)),
        repaint() {
            c.clear()
            if (!ed.seq||!ed.seq.ids) return
            if (ed.grid) c.grid(8, 16)
            let id = ed.seq.ids[ed.idx]
            let pic = ed.pic = ed.a.pics[id]
            if (!pic) return
            for (let y = 0; y < a.h; y++) {
                for (let x = 0; x < a.w; x++) {
                    let idx = y*a.w+x
                    let p = tmp.data[idx]
                    if (!p && pic.w > 0 && pic.h > 0) {
                        let py = y-pic.y
                        let px = x-pic.x
                        if (py >= 0 && py < pic.h && px >= 0 && px < pic.w) {
                            p = pic.data[py*pic.w+px]
                        }
                    }
                    if (p) {
                        c.ctx.fillStyle = cssColor(assetColor(a, p))
                        c.ctx.fillRect(x, y, 1, 1)
                    }
                }
            }
        },
        addSeq(s) {
            // add sequence to asset
            let idx = a.seq.findIndex(f => f.name == s.name)
            if (idx >= 0) {
                a.seq[idx] = s
            } else {
                a.seq.push(s)
                ed.updateSeq(s)
            }
            if (!ed.seq) {
                ed.sel(s, 0)
            }
        },
        updateSeq(s) {
            hReplace(seqCont, renderSeqs(ed))
            if (ed.seq == s) {
                hReplace(picsCont, renderPics(ed))
                if (!ed.pic && s && ed.idx >= 0) {
                    ed.pic = a.pics[s.ids[ed.idx]]
                    ed.repaint()
                }
            }
        },
        delSeq(name) {
            // remove sequence from asset
            let idx = a.seq.findIndex(s => s.name == name)
            if (idx >= 0) a.seq.splice(idx, 1)
            ed.updateSeq(s)
            if (ed.seq && ed.seq.name == name) {
                // change selection
                ed.sel(a.seq.length ? a.seq[0] : null, 0)
            }
        },
        addPic(pic) {
            if (!pic||pic.id <= 0) return
            ed.a.pics[pic.id] = pic
            if (ed.seq && ed.idx >= 0) {
                if (pic.id == ed.seq.ids[ed.idx]) {
                    ed.pic = pic
                    ed.repaint()
                }
            }
        },
        delPic(id) {
            // remove pic from asset seq
            let p = ed.a.pics[id]
            if (!p) return
            delete p[id]
        },
        sel(s, idx, force) {
            idx = idx||0
            if (!force && ed.seq == s && ed.idx == idx) return
            ed.seq = s
            ed.idx = idx
            ed.pic = a.pics[s.ids&&s.ids[idx]]
            tmp.reset()
            ed.repaint()
            hReplace(picsCont, renderPics(ed))
        },
    }
    if (ed.seq && ed.seq.ids) ed.pic = a.pics[ed.seq.ids[ed.idx]]
    c.el.addEventListener("mousedown", e => {
        if (!ed.pic) return
        if (e.button != 0) return
        if (ed.tool == 'pen' || ed.tool == 'brush') {
            let paintFunc = ed.tool == 'pen' ? paintPen : paintBrush
            let paint = e => {
                let p = c.stagePos(e)
                if (!p) return
                paintFunc(ed, p)
                if (ed.mirror) {
                    p.x = a.w-p.x-1
                    paintFunc(ed, p)
                }
            }
            c.startDrag(paint, e => {
                paint(e)
                let sel = tmp.getSel()
                if (!sel) return
                app.send("pic.edit", {
                    pic:ed.pic.id,
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
                        app.send("seq.new", {name:s.name})
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
    if (!f && c == 99) c = 0
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
    if (!pal) return null
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
        {name:'pen'},
        {name:'brush'},
    ]
    let opts = [
        {name:'mirror'},
        {name:'grid'},
    ]
    return h('section.tool.inline',
        h('header', 'Tools'),
        h('', tools.map(tool => h('span', {onclick: e => {
            ed.tool = tool.name
        }}, tool.name))),
        h('', opts.map(opt => h('span', {onclick: e => {
            ed[opt.name] = !ed[opt.name]
            if (opt.name == 'grid') ed.repaint()
        }}, opt.name)))
    )
}

function paintPen(ed, p) {
    ed.tmp.paint(p.x, p.y, ed.fg || 99)
    ed.c.ctx.fillStyle = ed.fgcolor
    ed.c.ctx.fillRect(p.x, p.y, 1, 1)
}
function paintBrush(ed, p) {
    ed.tmp.rect(p.x-1, p.y-1, 3, 3, ed.fg || 99)
    ed.c.ctx.fillStyle = ed.fgcolor
    ed.c.ctx.fillRect(p.x-1, p.y-1, 3, 3)
}

function boxContains(b, o) {
    return posInBox(o, b) && posInBox(boxEnd(o), b)
}
function boxEnd(b) {
    let x = b.x+b.w-1
    let y = b.y+b.h-1
    return {x, y}
}
function posInBox(p, b) {
    return p.x >= b.x && p.x < b.x+b.w && p.y >= b.y && p.y < b.y+b.h
}

function growPic(p, o) {
    if (o.w<=0||o.h<=0) return
    if (p.w<=0||p.h<=0) {
        p.x = o.x
        p.y = o.y
        p.w = o.w
        p.h = o.h
        p.data = new Array(p.w*p.h).fill(0)
    } else {
        let e = boxEnd(p)
        let f = boxEnd(o)
        let tmp = {}
        tmp.x = Math.min(p.x, o.x)
        tmp.y = Math.min(p.y, o.y)
        e.x = Math.max(e.x, f.x)
        e.y = Math.max(e.y, f.y)
        tmp.w = 1+e.x-tmp.x
        tmp.h = 1+e.y-tmp.y
        tmp.data = new Array(tmp.w*tmp.h).fill(0)
        copySel(tmp, p)
        Object.assign(p, tmp)
    }
}

function copySel(pic, sel, copy) {
    for (let i=0; i < sel.data.length; i++) {
        let p = sel.data[i]
        if (!p && !copy) continue
        let y = sel.y+Math.floor(i/sel.w) - pic.y
        let x = sel.x+(i%sel.w) - pic.x
        pic.data[y*pic.w+x] = p == 99 ? 0 : p
    }   
}