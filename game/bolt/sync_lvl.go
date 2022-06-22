package bolt

import "github.com/mb0/babasite/game/lvl"

type LvlSync lvl.Sys

func (s *LvlSync) Load(tx Src) (err error) {
	if err = LoadTable(tx, &s.Tset); err != nil {
		return err
	}
	if err = LoadTable(tx, &s.Lvl); err != nil {
		return err
	}
	if err = LoadTable(tx, &s.Grid); err != nil {
		return err
	}
	return nil
}

func (s *LvlSync) Dirty() bool {
	return s.Tset.Mods+s.Lvl.Mods+s.Grid.Mods > 0
}

func (s *LvlSync) Sync(tx Src) (err error) {
	if err = SyncTable(tx, &s.Tset); err != nil {
		return err
	}
	if err = SyncTable(tx, &s.Lvl); err != nil {
		return err
	}
	if err = SyncTable(tx, &s.Grid); err != nil {
		return err
	}
	return nil
}

func (s *LvlSync) Save(tx Src) (err error) {
	if err = SaveTable(tx, &s.Tset); err != nil {
		return err
	}
	if err = SaveTable(tx, &s.Lvl); err != nil {
		return err
	}
	if err = SaveTable(tx, &s.Grid); err != nil {
		return err
	}
	return nil
}
