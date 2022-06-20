package bolt

import "github.com/mb0/babasite/game/inv"

type InvSync inv.Sys

func (s *InvSync) Load(tx Src) (err error) {
	if err = LoadTable(tx, &s.Prod); err != nil {
		return err
	}
	if err = LoadTable(tx, &s.Item); err != nil {
		return err
	}
	if err = LoadTable(tx, &s.Inv); err != nil {
		return err
	}
	return nil
}

func (s *InvSync) Sync(tx Src) (err error) {
	if err = SyncTable(tx, &s.Prod); err != nil {
		return err
	}
	if err = SyncTable(tx, &s.Item); err != nil {
		return err
	}
	if err = SyncTable(tx, &s.Inv); err != nil {
		return err
	}
	return nil
}

func (s *InvSync) Save(tx Src) (err error) {
	if err = SaveTable(tx, &s.Prod); err != nil {
		return err
	}
	if err = SaveTable(tx, &s.Item); err != nil {
		return err
	}
	if err = SaveTable(tx, &s.Inv); err != nil {
		return err
	}
	return nil
}
