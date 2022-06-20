package lvl

import (
	"fmt"

	"github.com/mb0/babasite/game/ids"
)

type TsetTable = ids.ListTable[ids.Tset, Tileset, *Tileset]
type LvlTable = ids.ListTable[ids.Lvl, Lvl, *Lvl]
type GridTable = ids.ListTable[ids.Grid, Grid, *Grid]

// Sys is the tileset and level system.
type Sys struct {
	Tset TsetTable
	Lvl  LvlTable
	Grid GridTable
}

func (s *Sys) GetTset(name string) *Tileset {
	return s.Tset.Find(func(ts *Tileset) bool {
		return ts.Name == name
	})
}
func (s *Sys) NewTileset(name string) (*Tileset, error) {
	if !ids.NameCheck.MatchString(name) {
		return nil, fmt.Errorf("invalid name %s", name)
	}
	if old := s.GetTset(name); old != nil {
		return nil, fmt.Errorf("tileset %s already exists", name)
	}
	ts, err := s.Tset.New()
	if err != nil {
		return nil, err
	}
	ts.Name = name
	return ts, nil
}
