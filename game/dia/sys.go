package dia

import "github.com/mb0/babasite/game/ids"

type DiaTable = ids.ListTable[ids.Dia, Dia, *Dia]

// Sys is the dialog system of a game world where the dialog ids map into the list offset by one.
type Sys struct {
	Dia DiaTable
}

func (s *Sys) NewDia() (*Dia, error) {
	return s.Dia.New()
}
