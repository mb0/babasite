package bolt

import "github.com/mb0/babasite/game/obj"

func LoadObjStore(tx Src) (*obj.Store, error) {
	var data obj.Store
	err := LoadTable(tx, &data.Obj)
	return &data, err
}

func SyncObjStore(tx Src, data *obj.Store) error {
	return SyncTable(tx, &data.Obj)
}

func SaveObjStore(tx Src, data *obj.Store) error {
	return SaveTable(tx, &data.Obj)
}
