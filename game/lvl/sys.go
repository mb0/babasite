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
}

func (s *Sys) GetTset(name string) *Tset {
	return s.Tset.Find(func(ts *Tset) bool {
		return ts.Name == name
	})
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
	return ts, nil
}
func (s *Sys) DelTset(id ids.Tset) error {
	// abort if tset still in use
	if s.Lvl.Find(func(l *Lvl) bool { return l.Tset == id }) != nil {
		return fmt.Errorf("cannot delete %s %d used", id.Top(), id)
	}
	return s.Tset.Set(id, nil)
}
