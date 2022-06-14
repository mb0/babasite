package bolt

import (
	"github.com/mb0/babasite/game/dia"
)

func LoadDiaStore(tx Src) (*dia.Store, error) {
	var data dia.Store
	err := LoadTable(tx, &data.Dia)
	return &data, err
}

func SyncDiaStore(tx Src, data *dia.Store) error {
	return SyncTable(tx, &data.Dia)
}

func SaveDiaStore(tx Src, data *dia.Store) error {
	return SaveTable(tx, &data.Dia)
}
