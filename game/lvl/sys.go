package lvl

import (
	"fmt"

	"github.com/mb0/babasite/game/ids"
)

type TsetTable = ids.ListTable[ids.Tset, Tset, *Tset]
type LvlTable = ids.ListTable[ids.Lvl, Lvl, *Lvl]
type GridTable = ids.ListTable[ids.Grid, Grid, *Grid]

// Sys is the tileset and level system.
type Sys struct {
	Tset TsetTable
	Lvl  LvlTable
	Grid GridTable

	graphs map[ids.Lvl]*Graph
}

func (s *Sys) Graph(lvl ids.Lvl) (*Graph, error) {
	g, ok := s.graphs[lvl]
	if !ok {
		if s.graphs == nil {
			s.graphs = make(map[ids.Lvl]*Graph)
		}
		l, err := s.Lvl.Get(lvl)
		if err != nil {
			return nil, err
		}
		tset, err := s.Tset.Get(l.Tset)
		if err != nil {
			return nil, err
		}
		grid, err := s.Grid.Get(l.Grid)
		if err != nil {
			return nil, err
		}
		g = &Graph{Tset: tset, Grid: grid}
		s.graphs[lvl] = g
	}
	return g, nil
}

func (s *Sys) NewTset(name string) (*Tset, error) {
	err := ids.NamedUnique(&s.Tset, name)
	if err != nil {
		return nil, err
	}
	ts, err := s.Tset.New()
	if err != nil {
		return nil, err
	}
	ts.Name = name
	ts.Infos = []TileInfo{
		{Tile: 0, Name: "void", Color: 0x888888, Block: true, Group: "basic"},
		{Tile: 1, Name: "floor", Color: 0xffffff, Block: false, Group: "basic"},
	}
	return ts, nil
}
func (s *Sys) DelTset(id ids.Tset) error {
	// abort if tset still in use
	if s.Lvl.Find(func(l *Lvl) bool { return l.Tset == id }) != nil {
		return fmt.Errorf("cannot delete %s %d used", id.Top(), id)
	}
	return s.Tset.Set(id, nil)
}
func (s *Sys) NewLvl(req Lvl) (*Lvl, error) {
	lvl, err := s.Lvl.New()
	if err != nil {
		return nil, err
	}
	g, err := s.Grid.New()
	if err != nil {
		return nil, err
	}
	lvl.Name = req.Name
	lvl.Dim = req.Dim
	lvl.Tset = s.defTset(req.Tset)
	lvl.Grid = g.ID
	if lvl.W <= 0 {
		lvl.W = 80
	}
	if lvl.H <= 0 {
		lvl.H = lvl.W
	}
	return lvl, nil
}
func (s *Sys) DelLvl(id ids.Lvl) error {
	// lvl can be referenced in objs for now
	// TODO check for dangling refs
	return s.Lvl.Set(id, nil)
}

func (s *Sys) defTset(id ids.Tset) ids.Tset {
	p, _ := s.Tset.Get(id)
	if p != nil {
		return p.ID
	}
	return 0
}
