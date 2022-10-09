package lvl

import (
	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/pfind"
)

type Graph struct {
	Tset *Tset
	Grid *Grid

	can   Ability
	cache map[Tile]Ability
}

func (g *Graph) FindPath(from, to geo.Pos, a Ability) ([]pfind.Node, error) {
	g.can = a
	return pfind.FindPath(g, from, to)
}

func (g *Graph) Heur() pfind.Heur { return pfind.HeurDiag(10, 14) }

func (g *Graph) Near(p geo.Pos, f func(geo.Pos, int)) {
	if g.cache == nil {
		g.prep()
	}
	for _, d := range pfind.NeighborsDiag {
		d.Y += p.Y
		d.X += p.X
		if !d.In(g.Grid.Box) {
			continue
		}
		t := g.Grid.Get(d)
		if allow, ok := g.cache[t]; !ok || g.can != 0 && g.can&allow == 0 {
			continue
		}
		c := 14
		if d.X == p.X || d.Y == p.Y {
			c = 10
		}
		f(d, c)
	}
}
func (g *Graph) prep() {
	m := make(map[Tile]Ability, len(g.Tset.Infos))
	for _, t := range g.Tset.Infos {
		if !t.Block {
			m[t.Tile] = t.Allow
		}
	}
	g.cache = m
}
