package bolt

import (
	"github.com/mb0/babasite/game/inv"
)

func LoadInvStore(tx Src) (data *inv.Store, err error) {
	data = &inv.Store{}
	if err = LoadTable(tx, &data.Prod); err != nil {
		return nil, err
	}
	if err = LoadTable(tx, &data.Item); err != nil {
		return nil, err
	}
	if err = LoadTable(tx, &data.Inv); err != nil {
		return nil, err
	}
	return data, nil
}

func SyncInvStore(tx Src, data *inv.Store) (err error) {
	if err = SyncTable(tx, &data.Prod); err != nil {
		return err
	}
	if err = SyncTable(tx, &data.Item); err != nil {
		return err
	}
	if err = SyncTable(tx, &data.Inv); err != nil {
		return err
	}
	return nil
}

func SaveInvStore(tx Src, data *inv.Store) (err error) {
	if err = SaveTable(tx, &data.Prod); err != nil {
		return err
	}
	if err = SaveTable(tx, &data.Item); err != nil {
		return err
	}
	if err = SaveTable(tx, &data.Inv); err != nil {
		return err
	}
	return nil
}
