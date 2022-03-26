import {app, h} from './app.js'
import {chat} from './chat.js'

let cont = null
let listeners = {}
let infos = []
app.addView({name: "chared",
    label: "Character Editor",
    start(app) {
        chat.start(app)
        cont = h('')
        app.cont.appendChild(h('#chared-view',
            app.linksFor("chared"), cont,
        ))
        listeners = {
            "init": res => {
                infos = res.assets
                cont.appendChild(assetSelect(infos))
                cont.appendChild(assetForm({}))
            },
            "asset.new": res => {
                cont.innerHTML = ""
                cont.appendChild(assetSelect(infos))
                cont.appendChild(assetEditor(res))
            },
            "asset.open": res => {
                cont.innerHTML = ""
                cont.appendChild(assetSelect(infos))
                cont.appendChild(assetEditor(res))
            }
        }
        app.on(listeners)
    },
    stop() {
        chat.stop()
        app.off(listeners)
    }
})
let kinds = [
    {kind:'char', name:'Character'},
    {kind:'tile', name:'Map Tile'},
    {kind:'item', name:'Item'}
]

function assetSelect(infos) {
    return h('section',
        h('header', 'Asset auswählen'),
        h('ul', infos.map(info => h('li', h('a', {href:'?', onclick: e =>{
            e.preventDefault()
            console.log("select asset", info.name)
            app.send("asset.open", {id:info.id})
        }}, info.name))))
    )
}

function assetForm(a) {
    a = a || {}
    let name = h('input', {type:'text', value:a.name||''})
    let kind = h('select', kinds.map(k =>
        h('option', {selected:k.kind==a.kind, value:k.kind}, k.name)
    ))
    let submit = e => {
        e.preventDefault()
        let a = {name: name.value, kind: kind.value}
        console.log('submit asset form', a)
        app.send("asset.new", a)
    }
    return h('section',
        h('header', 'Asset erstellen'),
        h('form', {onsubmit:submit},
            h('', h('label', "Name"), name),
            h('', h('label', "Art"), kind),
            h('button', 'Neu Anlegen')
        )
    )
}

function assetEditor(a) {
    return h('', 'Asset: '+ a.name +', art: '+ a.kind,
        !a.seq ? h('', 'no sequnces') : a.seq.map(s => h('', s.name)),
        // tools and color pallette
        h('', 'Pallette '+ a.pal.name,
            !a.pal.colors ? h('', 'no colors') : a.pal.colors.map(c => 
                h('input', {type:'color', value: cssColor(c)})
            )
        )
        // canvas
    )
}

function cssColor(c) {
    let s = c.toString(16)
    return '#' + '000000'.slice(s.length) + s
}