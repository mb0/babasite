package obj

import (
	"fmt"

	"github.com/mb0/babasite/game/ids"
)

type InfoTable = ids.ListTable[ids.Info, Info, *Info]
type ObjTable = ids.ListTable[ids.Obj, Obj, *Obj]

// Sys is the object system of a game world where the obj ids map into the list offset by one.
type Sys struct {
	Info InfoTable
	Obj  ObjTable
}

func (s *Sys) NewInfo(name string) (*Info, error) {
	err := ids.NamedUnique(&s.Info, name)
	if err != nil {
		return nil, err
	}
	o, err := s.Info.New()
	if err != nil {
		return nil, err
	}
	o.Name = name
	return o, nil
}

func (s *Sys) DelInfo(id ids.Info) error {
	// abort if the info is still in use
	if s.Obj.Find(func(o *Obj) bool { return o.Info == id }) != nil {
		return fmt.Errorf("cannot delete %s %d used", id.Top(), id)
	}
	return s.Info.Set(id, nil)
}

func (s *Sys) NewObj(nfo ids.Info) (*Obj, error) {
	o, err := s.Obj.New()
	if err != nil {
		return nil, err
	}
	o.Info = nfo
	return o, nil
}

func (s *Sys) DelObj(id ids.Obj) error {
	// TODO check for dangling refs
	return s.Obj.Set(id, nil)
}
