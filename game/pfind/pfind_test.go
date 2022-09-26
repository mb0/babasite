package pfind

import (
	"fmt"
	"strings"
	"testing"

	"github.com/mb0/babasite/game/geo"
)

var map1 = `
1111111111111111111
1000000000010000001
1000000001010111111
1000000001000000001
1111111111111111111`

var map2 = `
1111111111111111111
1000000000000000001
1001001101010111101
1000000001000000001
1111111111111111111`

func TestDStar(t *testing.T) {
	tests := []struct {
		graph string
		start geo.Pos
		goal  geo.Pos
		want  string
	}{
		{graph: map1, start: geo.Pos{X: 2, Y: 2}, goal: geo.Pos{X: 8, Y: 2},
			want: "2,2 3,2 4,2 5,2 6,2 7,2 8,2"},
		{graph: map1, start: geo.Pos{X: 2, Y: 2}, goal: geo.Pos{X: 16, Y: 1},
			want: "2,2 3,2 4,2 5,2 6,2 7,2 8,2 9,1 10,2 11,3 12,2 13,1 14,1 15,1 16,1"},
		{graph: map2, start: geo.Pos{X: 2, Y: 2}, goal: geo.Pos{X: 17, Y: 2},
			want: "2,2 3,1 4,1 5,1 6,1 7,1 8,1 9,1 10,1 11,1 12,1 13,1 14,1 15,1 16,1 17,2"},
	}
	for i, test := range tests {
		graph := strGraph(test.graph)
		p, _ := FindPath(graph, test.start, test.goal)
		if got := pathStr(p); test.want != got {
			t.Errorf("test %d want path %s\n got %s", i, test.want, got)
		}
	}
}

func pathStr(p []Node) string {
	if p == nil {
		return ""
	}
	var b strings.Builder
	for _, n := range p {
		fmt.Fprintf(&b, "%d,%d ", n.X, n.Y)
	}
	res := b.String()
	if res != "" {
		res = res[:len(res)-1]
	}
	return res
}

func strGraph(s string) *StrGraph {
	rows := strings.Split(s, "\n")
	for len(rows) > 0 && rows[0] == "" {
		rows = rows[1:]
	}
	return &StrGraph{rows}
}

type StrGraph struct {
	Rows []string
}

func (g *StrGraph) Heur() Heur { return HeurManhattan(10) }

func (g *StrGraph) Near(p geo.Pos) (res []Node) {
	// get all neighbours
	for _, d := range NeighborsDiag {
		y := p.Y + d.Y
		if y < 0 || y >= len(g.Rows) {
			continue
		}
		row := g.Rows[y]
		x := p.X + d.X
		if x < 0 || x >= len(row) {
			continue
		}
		t := row[x]
		if t == '1' {
			continue
		}

		n := geo.Pos{X: x, Y: y}
		c := 14
		if d.X == 0 || d.Y == 0 {
			c = 10
		}
		res = append(res, Node{Pos: n, Cost: c})
	}
	return res
}
