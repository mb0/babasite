import h from 'web/html'
import {ToolCtx} from 'game/editor'
import {Grid, gridMirrorH, gridMirrorV, gridRot270, gridRot90} from 'game/grid'
import {Pixel} from './asset'


const tools = ['pen', 'brush', 'select', 'move']

const opts = ['mirror', 'grid']

export interface ToolViewCtx {
	tool:ToolCtx<Pixel>
	float:Grid<Pixel>|null
	color(t:Pixel):string
	repaint():void
	anchorFloat():void
}

export interface ToolView {
	el:HTMLElement
	ctx:ToolViewCtx
	updateColor():void
	updateTool():void
}

export function toolView(ctx:ToolViewCtx):ToolView {
	const el = h('section.tool.inline')
	const fgs = h('span')
	const bgs = h('span')
	const fl = h('')
	h.add(el,
		h('header', 'Tools'),
		h('', tools.map(tool => h('label', h('input', {
			type:'radio', name:'tool', value:tool,
			checked: ctx.tool.active == tool,
			onchange: () => ctx.tool.active = tool,
		}), tool))),
		h('', opts.map(opt => h('label', h('input', {
			type:'checkbox', name:opt,
			checked: (ctx.tool as any)[opt],
			onchange: () => {
				const c = ctx.tool as any
				c[opt] = !c[opt]
				if (opt == 'grid') ctx.repaint()
			},
		}), opt))),
		h('.color', fgs, bgs),
		fl,
	)
	const updateColor = () => {
		const {fg, bg} = ctx.tool
		fgs.style.backgroundColor = ctx.color(fg)
		bgs.style.backgroundColor = ctx.color(bg)
	}
	const updateTool = () => {
		if (ctx.float) {
			h.repl(fl, "Auswahl ",
				h('button', {type:'button', onclick:()=>{
					ctx.anchorFloat()
				}}, 'Anwenden'),
				h('br'), "Spiegeln ",
				h('button', {type:'button', onclick:()=>{
					gridMirrorH(ctx.float!)
					ctx.repaint()
				}}, 'Horizontal'),
				h('button', {type:'button', onclick:()=>{
					gridMirrorV(ctx.float!)
					ctx.repaint()
				}}, 'Vertikal'),
				h('br'), "Drehen ",
				h('button', {type:'button', onclick:()=>{
					gridRot270(ctx.float!)
					ctx.repaint()
				}}, 'Links'),
				h('button', {type:'button', onclick:()=>{
					gridRot90(ctx.float!)
					ctx.repaint()
				}}, 'Rechts'),
			)
		} else {
			h.repl(fl)
		}
	}
	updateColor()
	updateTool()
	return {el, ctx, updateColor, updateTool}
}
