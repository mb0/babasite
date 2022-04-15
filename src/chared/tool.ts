import h from 'web/html'
import {ToolCtx} from 'game/editor'
import {Pixel} from './pal'


const tools = ['pen', 'brush', 'select']

const opts = ['mirror', 'grid']

export interface ToolViewCtx {
	tool:ToolCtx<Pixel>
	repaint():void
}

export interface ToolView {
	el:HTMLElement
	ctx:ToolViewCtx
}

export function toolView(ctx:ToolViewCtx):ToolView {
	const el = h('section.tool.inline')
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
		}), opt)))
	)
	return {el, ctx}
}
