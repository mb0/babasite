import {Pos, posIn} from 'game/geo'
import {GridEditor} from './editor'

// two fill algorithms from the wiki page https://en.wikipedia.org/wiki/Flood_fill

// the simple version works well enough for our usecase, but will fail on larger images
// with a recursion exception
export function floodFill<T>(ed:GridEditor<T>, p:Pos, t:T) {
	if (!(posIn(p, ed.img!) && !ed.tmp.sel.get(p) && ed.img!.get(p) == t)) return
	ed.tmp.paint(p, t)
	floodFill(ed, {x:p.x, y:p.y+1}, t)
	floodFill(ed, {x:p.x, y:p.y-1}, t)
	floodFill(ed, {x:p.x+1, y:p.y}, t)
	floodFill(ed, {x:p.x-1, y:p.y}, t)
}

// the scan fill version uses a stack of candidate rows to scan and works for large images
export function spanFill<T>(ed:GridEditor<T>, p:Pos, t:T) {
	const inside = (p:Pos) => posIn(p, ed.img!) && !ed.tmp.sel.get(p) && ed.img!.get(p) == t
	if (!inside(p)) return
	const {x, y} = p
	// we use an array as candidate stack that contains arrays with four numbers [x1, x2, y, dy]
	const s:number[][] = [[x, x, y, 1], [x, x, y-1, -1]]
	// as long as there are row candidates on the stack we work the one from the top
	while (s.length) {
		let [x1, x2, y, dy] = s.pop()!
		let x = x1
		if (inside({x, y})) {
			while (inside({x:x-1, y})) {
				x = x-1
				ed.tmp.paint({x, y}, t)
			}
		}
		if (x < x1) {
			s.push([x, x1-1, y-dy, -dy])
		}
		while (x1 <= x2) {
			while (inside({x:x1, y})) {
				ed.tmp.paint({x:x1, y}, t)
				x1 = x1+1
				s.push([x, x1-1, y+dy, dy])
				if (x1-1 > x2) {
					s.push([x2+1, x1-1, y-dy, -dy])
				}
			}
			x1 = x1+1
			while (x1 < x2 && !inside({x:x1, y})) {
				x1 = x1+1
			}
			x = x1
		}
	}
}
