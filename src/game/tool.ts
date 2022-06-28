import {h, hIcon} from 'web/html'
import {Float, ToolCtx, tools} from 'game/editor'
import {gridMirrorH, gridMirrorV, gridRot270, gridRot90} from 'game/grid'


const opts = ['mirror', 'grid']

export interface ToolViewCtx<T> {
	tool:ToolCtx<T>
	float?:Float<T>
	color(t:T):string
	repaint():void
	anchorFloat():void
}

export interface ToolView<T> {
	el:HTMLElement
	ctx:ToolViewCtx<T>
	updateColor():void
	updateTool():void
}

export function toolView<T>(ctx:ToolViewCtx<T>):ToolView<T> {
	const el = h('.tool')
	const fgs = h('span')
	const bgs = h('span')
	const fl = h('.row')
	h.add(el,
		h('.row', Object.keys(tools).map(tool => h('label', h('input', {
			type:'radio', name:'tool', value:tool,
			checked: ctx.tool.active == tool,
			onchange: () => ctx.tool.active = tool,
		}), hIcon(tool)))),
		h('.row', opts.map(opt => h('label', h('input', {
			type:'checkbox', name:opt,
			checked: (ctx.tool as any)[opt],
			onchange: () => {
				const c = ctx.tool as any
				c[opt] = !c[opt]
				if (opt == 'grid') ctx.repaint()
			},
		}), hIcon(opt))), h('span.color', fgs, bgs)),
		fl,
	)
	const updateColor = () => {
		const {fg, bg} = ctx.tool
		fgs.style.backgroundColor = ctx.color(fg)
		bgs.style.backgroundColor = ctx.color(bg)
	}
	const updateTool = () => {
		if (ctx.float) {
			const act = el.querySelector("input[value='"+ctx.tool.active+"']")
			if (act) (act as HTMLInputElement).checked = true
			h.repl(fl,
				h('a', {onclick:()=>{
					ctx.anchorFloat()
				}}, hIcon('anchor', {title:'Auswahl verankern'})),
				h('a', {onclick:()=>{
					gridMirrorH(ctx.float!)
					ctx.repaint()
				}}, hIcon('fliph', {title:'Horizontal spiegeln'})),
				h('a', {onclick:()=>{
					gridMirrorV(ctx.float!)
					ctx.repaint()
				}}, hIcon('flipv', {title:'Vertikal spiegeln'})),
				h('a', {onclick:()=>{
					gridRot270(ctx.float!)
					ctx.repaint()
				}}, hIcon('rot90', {title:'Links herum drehen'})),
				h('a', {onclick:()=>{
					gridRot90(ctx.float!)
					ctx.repaint()
				}}, hIcon('rot270', {title:'Rechts herum drehen'})),
			)
		} else {
			h.repl(fl)
		}
	}
	updateColor()
	updateTool()
	return {el, ctx, updateColor, updateTool}
}
