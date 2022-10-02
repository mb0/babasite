package obj

import "github.com/mb0/babasite/game/ids"

type ObjTable = ids.ListTable[ids.Obj, Obj, *Obj]

// Sys is the object system of a game world where the obj ids map into the list offset by one.
type Sys struct {
	Obj ObjTable
}

func (s *Sys) NewObj() (*Obj, error) {
	return s.Obj.New()
}

func (s *Sys) DelObj(id ids.Obj) {
	// TODO check for dangling refs
	s.Obj.Set(id, nil)
}
