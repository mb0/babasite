package obj

import "github.com/mb0/babasite/game/ids"

type ObjTable = ids.ListTable[ids.Obj, Obj, *Obj]

type Store struct {
	Obj ObjTable
}

func (s *Store) Dirty() bool { return len(s.Obj.Mod) > 0 }

// Sys is the object system of a game world where the obj ids map into the list offset by one.
type Sys struct {
	*Store
}

func (s *Sys) NewObj() (*Obj, error) {
	id, err := s.Obj.NewID()
	if err != nil {
		return nil, err
	}
	res := &Obj{ID: id}
	s.Obj.Set(id, res)
	return res, nil
}

func (s *Sys) DelObj(id ids.Obj) {
	s.Obj.Set(id, nil)
}
