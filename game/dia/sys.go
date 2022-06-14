package dia

import "github.com/mb0/babasite/game/ids"

type DialogTable = ids.ListTable[ids.Dia, Dialog, *Dialog]

type Store struct {
	Dia DialogTable
}

func (s *Store) Dirty() bool { return len(s.Dia.Mod) > 0 }

// Sys is the dialog system of a game world where the dialog ids map into the list offset by one.
type Sys struct {
	*Store
}

func (s *Sys) NewDialog() (*Dialog, error) {
	id, err := s.Dia.NewID()
	if err != nil {
		return nil, err
	}
	res := &Dialog{ID: id}
	err = s.Dia.Set(id, res)
	return res, err
}
