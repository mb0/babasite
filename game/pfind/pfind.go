package pfind

import (
	"container/heap"
	"fmt"

	"github.com/mb0/babasite/game/geo"
)

type Graph interface {
	Heur() Heur
	Near(geo.Pos, func(geo.Pos, int))
}

type Heur func(from, to geo.Pos) int

func HeurManhattan(scale int) func(from, to geo.Pos) int {
	return func(from, to geo.Pos) int {
		x := from.X - to.X
		y := from.X - to.Y
		if x < 0 {
			x = -x
		}
		if y < 0 {
			y = -x
		}
		return scale * (x + y)
	}
}
func HeurDiag(scale, diag int) func(from, to geo.Pos) int {
	return func(from, to geo.Pos) int {
		x := from.X - to.X
		y := from.X - to.Y
		if x < 0 {
			x = -x
		}
		if y < 0 {
			y = -x
		}
		min, max := x, y
		if y < x {
			min, max = y, x
		}
		return min*diag + (max-min)*scale
	}
}

// FindPath uses a focused D* search algorithm for a generic graph
// see https://en.wikipedia.org/wiki/D*
func FindPath(g Graph, start, goal geo.Pos) ([]Node, error) {
	open := &Heap{[]Node{{start, 0}}}
	cost := map[geo.Pos]Hist{start: {}}
	heur := g.Heur()
	// inspect map
	for len(open.Data) > 0 {
		c := heap.Pop(open).(Node)
		if c.Pos == goal {
			break
		}
		old := cost[c.Pos]
		g.Near(c.Pos, func(n geo.Pos, nc int) {
			score := old.Score + nc
			prev, ok := cost[n]
			if !ok || score < prev.Score {
				cost[n] = Hist{Score: score, From: &c.Pos}
				est := score + heur(n, goal)
				open.Upsert(n, est)
			}
		})
	}
	fin, ok := cost[goal]
	if !ok {
		return nil, fmt.Errorf("no path found")
	}
	// trace path
	var res []Node
	for cur, h := goal, fin; h.From != nil; {
		res = append(res, Node{Pos: cur, Cost: h.Score})
		cur = *h.From
		h = cost[cur]
	}
	res = append(res, Node{Pos: start, Cost: 0})
	reverse(res)
	return res, nil
}

var NeighborsDiag = []geo.Pos{
	{X: -1, Y: -1},
	{X: 0, Y: -1},
	{X: 1, Y: -1},
	{X: -1, Y: 0},
	{X: 1, Y: 0},
	{X: -1, Y: 1},
	{X: 0, Y: 1},
	{X: 1, Y: 1},
}
var NeighborsRect = []geo.Pos{
	{X: 0, Y: -1},
	{X: -1, Y: 0},
	{X: 1, Y: 0},
	{X: 0, Y: 1},
}

func reverse(ns []Node) {
	for i, l := 0, len(ns)-1; i < l; i, l = i+1, l-1 {
		ns[i], ns[l] = ns[l], ns[i]
	}
}

type Hist struct {
	Score int
	From  *geo.Pos
}

type Heap struct {
	Data []Node
}

type Node struct {
	geo.Pos
	Cost int
}

func (h *Heap) Less(i, j int) bool { return h.Data[i].Cost < h.Data[j].Cost }
func (h *Heap) Swap(i, j int)      { h.Data[i], h.Data[j] = h.Data[j], h.Data[i] }
func (h *Heap) Len() int           { return len(h.Data) }
func (h *Heap) Push(v any)         { h.Data = append(h.Data, v.(Node)) }
func (h *Heap) Pop() (v any) {
	lst := len(h.Data) - 1
	h.Data, v = h.Data[:lst], h.Data[lst]
	return v
}
func (h *Heap) Find(p geo.Pos) int {
	for i, o := range h.Data {
		if p == o.Pos {
			return i
		}
	}
	return -1
}
func (h *Heap) Upsert(p geo.Pos, cost int) {
	idx := h.Find(p)
	if idx < 0 {
		heap.Push(h, Node{Pos: p, Cost: cost})
	} else {
		h.Data[idx].Cost = cost
		heap.Fix(h, idx)
	}
}
