package bolt

import "github.com/mb0/babasite/game/obj"

type ObjSync obj.Sys

func (s *ObjSync) Load(tx Src) error {
	return LoadTable(tx, &s.Obj)
}

func (s *ObjSync) Sync(tx Src) error {
	return SyncTable(tx, &s.Obj)
}

func (s *ObjSync) Save(tx Src) error {
	return SaveTable(tx, &s.Obj)
}
