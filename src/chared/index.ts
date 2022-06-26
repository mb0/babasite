import h from 'web/html'
import {boxIn} from 'game/geo'
import {gridTiles, gridSel, gridEach} from 'game/grid'
import {Layout, newLayout} from 'game/dock'
import {View, app, chat, menu} from 'app'
import {Subs} from 'app/hub'
import {AssetInfo, Pic, Pixel, picInit, growPic} from './asset'
import {Palette} from './pal'
import {AssetSelect, assetSelect, assetOverview} from './asset_sel'
import {AssetEditor, assetEditor} from './asset_editor'


export interface AssetView extends View {
	infos:AssetInfo[]
	pals:Palette[]
	dock:Layout
	sel:AssetSelect
	ed?:AssetEditor|null
}

const view:AssetView = {name:"chared", label:"Character Editor",
	pals: [], infos: [],
	dock: newLayout('#chared'),
	sel: assetSelect(),
	start() {
		app.on(this.subs = assetSubs(this))
		const chatel = chat.start()
		const d = this.dock
		h.add(d.head, h('', menu(), this.sel.el))
		h.add(d.el, h('style', style))
		d.add({label:'Chat', el:chatel})
		return d.el
	},
	stop() {
		chat.stop()
		const {ed, subs} = this
		app.off(subs!)
		if (ed) ed.stop()
		this.dock = newLayout('#chared')
	}
}

app.addView(view)
const assetSubs = (v:AssetView):Subs => ({
	"init": res => {
		v.infos = res.assets||[]
		v.pals = res.pals||[]
		v.sel.update(v.infos)
		h.repl(v.dock.main, assetOverview(v.infos))
		const {hash} = location
		if (hash?.length > 1) {
			const idx = hash.indexOf('/')
			if (idx > 0) {
				const name = hash.slice(idx+1)
				if (name) app.send("asset.open", {name})
			}
		}
	},
	"pal.new": (res, subj) => {
		if (isErr(res, subj)) return
		// add to list of pals in sort order
		let idx = v.pals.findIndex(p => p.name > res.name)
		if (idx<0) idx = v.pals.length
		v.pals.splice(idx, 0, res)
	},
	"pal.open":(res, subj) => {
		if (isErr(res, subj)) return
		let p = v.pals.find(p => p.name == res.name)
		if (!p) return
		if (v.ed) {
			v.ed.updatePal(p)
		} else {
			// TODO pal editor?
		}
	},
	// TODO "pal.del":
	"pal.edit": (res, subj) => {
		if (isErr(res, subj)) return
		let p = v.pals.find(p => p.name == res.name)
		if (!p) return
		if (!p.feat) p.feat = []
		// update feature
		let f = p.feat.find(f => f.name == res.feat)
		if (f) {
			if (f.colors) {
				let args:any = [res.idx||0, res.del||0]
				if (res.ins) args = args.concat(res.ins)
				f.colors.splice.apply(f.colors, args)
			} else {
				f.colors = res.ins
			}
		} else if (!res.idx && !res.del) {
			f = {name:res.feat, colors:res.ins||[]}
			p.feat.push(f)
		} else {
			return
		}
		p.cache?.reset()
		if (v.ed) {
			if (v.ed.a.pal == p.name) {
				v.ed.updatePal(p)
			}
		} else {
			// TODO pal editor?
		}
	},
	"asset.new": (res, subj) => {
		if (isErr(res, subj)) return
		v.infos.push(res as AssetInfo)
		v.infos.sort((a, b) => a.name < b.name ? -1 : (a.name > b.name ? 1 : 0))
		v.sel.update(v.infos)
	},
	"asset.open": (res, subj) => {
		if (isErr(res, subj)) return
		if (v.ed) v.ed.stop()
		Object.values(res.pics).forEach(p => picInit(p as Pic))
		v.ed = assetEditor(res, v.pals, v.dock)
		h.repl(v.dock.main, v.ed.el)
		location.hash = '#chared/'+ res.name
	},
	"asset.del": () => {
		// TODO
	},
	"seq.new": (res, subj) => {
		if (isErr(res, subj)||!v.ed) return
		if (res.pics) res.pics.forEach((p:Pic) => {
			picInit(p)
			v.ed!.addPic(p)
		})
		v.ed.addSeq(res)
	},
	"seq.del": (res, subj) => {
		if (isErr(res, subj)||!v.ed) return
		v.ed.delSeq(res.name)
	},
	"seq.edit": (res, subj) => {
		if (isErr(res, subj)||!v.ed) return
		if (res.pics) res.pics.forEach((p:Pic) => {
			picInit(p)
			v.ed!.addPic(p)
		})
		let s = v.ed.a.seq.find(s => s.name == res.name)
		if (!s) return
		let args:any = [res.idx||0, res.del||0]
		if (res.ins) args = args.concat(res.ins)
		s.ids.splice.apply(s.ids, args)
		v.ed.updateSeq(s)
	},
	// TODO pic.del for garbage collection
	"pic.edit": (res, subj) => {
		if (isErr(res, subj) || !v.ed) return
		// get pic
		let pic = v.ed.a.pics[res.pic]
		if (!pic) return
		if (res.repl) {
			const {x, y, w, h} = res
			Object.assign(pic, {x, y, w, h, raw:Array(w*h).fill(0)})
		} else if (!boxIn(res, pic)) growPic(pic, res)
		if (res.fill !== undefined) {
			if (res.raw?.length) {
				const sel = gridSel(res, res.raw)
				gridEach(sel, p => pic.set(p, res.fill), pic, false)
			} else {
				gridEach(pic, p => pic.set(p, res.fill), res)
			}
		} else {
			const img = gridTiles<Pixel>(res, res.raw)
			gridEach(img, (p, t) => pic.set(p, t), pic,
				!res.copy ? 0 : undefined)
		}
		// repaint canvas if pic is active sequence
		if (v.ed.seq?.ids?.includes(pic.id)) {
			v.ed.updateSeq(v.ed.seq)
			if (v.ed.img?.id == pic.id) v.ed.repaint()
		}
	},
})
function isErr(res:any, subj:string) {
	if (res&&res.err) {
		console.error("error message: "+ subj, res.err)
		return true
	}
	return false
}

const style = `
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
.color span {
	display: inline-block;
	width:40px;
	height:20px;
}
form span.help {
	margin-left: 16px;
}
.asset-editor {
	max-height: 100%;
	flex: 1 1 0;
	display: flex;
	flex-direction: column;
}
.asset-editor .seq {
	flex: 0 1 auto;
}
.asset-editor #editor-canvas {
	max-width: 100%;
	display:block;
	flex: 1 1 0;
}
#seq-preview {
	flex: 0 0 auto;
	align-self: center;
}
`
