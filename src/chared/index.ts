import h from 'web/html'
import {boxIn} from 'game/geo'
import {Grid, gridTiles, gridSel, gridEach} from 'game/grid'
import app from 'app'
import {chat} from 'app/chat'
import {Pixel, Palette} from './pal'
import {assetSelect} from './asset_sel'
import {AssetEditor, assetEditor} from './asset_editor'
import {Pic, picInit, growPic} from './pic'

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
.color span {
	display: inline-block;
	width:40px;
	height:20px;
}
`
let ed:AssetEditor|null = null
app.addView({name: "chared",
	label: "Character Editor",
	start(app) {
		chat.start(app)
		let assets = assetSelect([])
		let cont = h('')
		let pals:Palette[] = []
		h.add(app.cont, h('#chared',
			h('style', cssStyle), assets.el, cont,
		))
		this.subs = {
			"init": res => {
				assets.details.style.display = 'block'
				assets.update(res.assets||[])
				pals = res.pals
			},
			"pal.new": (res, subj) => {
				if (isErr(res, subj)) return
				// add to list of pals in sort order
				let idx = pals.findIndex(p => p.name > res.name)
				if (idx<0) idx = pals.length
				pals.splice(idx, 0, res)
			},
			"pal.open":(res, subj) => {
				if (isErr(res, subj)) return
				let p = pals.find(p => p.name == res.name)
				if (!p) return
				if (ed) {
					ed.updatePal(p)
				} else {
					// TODO pal editor?
				}
			},
			// TODO "pal.del":
			"pal.edit": (res, subj) => {
				if (isErr(res, subj)) return
				let p = pals.find(p => p.name == res.name)
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
				if (ed) {
					if (ed.a.pal == p.name) {
						ed.updatePal(p)
					}
				} else {
					// TODO pal editor?
				}
			},
			"asset.new": (res, subj) => {
				if (isErr(res, subj)) return
				assets.addInfo(res)
			},
			"asset.open": (res, subj) => {
				if (isErr(res, subj)) return
				assets.details.style.display = 'none'
				if (ed) ed.stop()
				Object.values(res.pics).forEach(p => picInit(p as Pic))
				ed = assetEditor(res, pals)
				h.repl(cont, ed.el)
			},
			"asset.del": () => {
				// TODO
			},
			"seq.new": (res, subj) => {
				if (isErr(res, subj)||!ed) return
				if (res.pics) res.pics.forEach((p:Pic) => {
					picInit(p)
					ed?.addPic(p)
				})
				ed.addSeq(res)
			},
			"seq.del": (res, subj) => {
				if (isErr(res, subj)||!ed) return
				ed.delSeq(res.name)
			},
			"seq.edit": (res, subj) => {
				if (isErr(res, subj)||!ed) return
				if (res.pics) res.pics.forEach((p:Pic) => {
					picInit(p)
					ed?.addPic(p)
				})
				let s = ed.a.seq.find(s => s.name == res.name)
				if (!s) return
				let args:any = [res.idx||0, res.del||0]
				if (res.ins) args = args.concat(res.ins)
				s.ids.splice.apply(s.ids, args)
				ed.updateSeq(s)
			},
			// TODO pic.del for garbage collection
			"pic.edit": (res, subj) => {
				if (isErr(res, subj) || !ed) return
				// get pic
				let pic = ed.a.pics[res.pic]
				if (!pic) return
				if (!boxIn(pic, res)) growPic(pic, res)
				if (res.fill !== undefined) {
					fillSel(pic, gridSel(res, res.raw), res.fill)
				} else {
					copySel(pic, gridTiles<Pixel>(res, res.raw), res.copy)
				}
				// repaint canvas if pic is active sequence
				if (ed.seq?.ids?.includes(pic.id)) {
					ed.updateSeq(ed.seq)
					if (ed.img?.id == pic.id) ed.repaint()
				}
			},
		}
	},
	stop() {
		chat.stop()
		if (ed) ed.stop()
	}
})
function isErr(res:any, subj:string) {
	if (res&&res.err) {
		console.error("error message: "+ subj, res.err)
		return true
	}
	return false
}

function copySel(pic:Grid<Pixel>, sel:Grid<Pixel>, copy?:boolean) {
	growPic(pic, sel)
	gridEach(sel, (p, t) => pic.set(p, t), pic, !copy ? 0 : undefined)
}
function fillSel(pic:Grid<Pixel>, sel:Grid<boolean>, fill:Pixel) {
	growPic(pic, sel)
	gridEach(sel, p => pic.set(p, fill), pic, false)
}
