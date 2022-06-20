package bolt

import "github.com/mb0/babasite/game/dia"

type DiaSync dia.Sys

func (s *DiaSync) Load(tx Src) error {
	return LoadTable(tx, &s.Dia)
}

func (s *DiaSync) Sync(tx Src) error {
	return SyncTable(tx, &s.Dia)
}

func (s *DiaSync) Save(tx Src) error {
	return SaveTable(tx, &s.Dia)
}
