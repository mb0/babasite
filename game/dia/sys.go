package dia

import "github.com/mb0/babasite/game/ids"

type DialogTable = ids.ListTable[ids.Dia, Dialog, *Dialog]

// Sys is the dialog system of a game world where the dialog ids map into the list offset by one.
type Sys struct {
	Dia DialogTable
}

func (s *Sys) NewDialog() (*Dialog, error) {
	return s.Dia.New()
}
