package chared

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/tidwall/buntdb"
)

func fmtID(pref string, id uint32) string {
	return fmt.Sprintf("%s%08x", pref, id)
}

type BuntStore struct {
	*buntdb.DB
	maxID uint32
}

func NewBuntStore(db *buntdb.DB) *BuntStore {
	return &BuntStore{DB: db}
}

func (s *BuntStore) loadMaxID() error {
	return s.View(func(tx *buntdb.Tx) error {
		got, err := tx.Get("_asset_maxid")
		if err != nil {
			return err
		}
		max, err := strconv.ParseUint(got, 16, 32)
		s.maxID = uint32(max)
		return err
	})
}

func (s *BuntStore) LoadAll() (res []*Asset, err error) {
	s.loadMaxID()
	err = s.View(func(tx *buntdb.Tx) error {
		return tx.AscendKeys("asset.*", func(key, value string) bool {
			var a Asset
			json.Unmarshal([]byte(value), &a)
			res = append(res, &a)
			return true
		})
	})
	return res, err
}

func (s *BuntStore) SaveAsset(a *Asset) error {
	var updateMax bool
	if a.ID == 0 {
		s.maxID++
		updateMax = true
		a.ID = uint32(s.maxID)
	}
	raw, err := json.Marshal(a)
	if err != nil {
		return err
	}
	return s.Update(func(tx *buntdb.Tx) error {
		if updateMax {
			_, _, err := tx.Set("_asset_maxid", fmt.Sprintf("%x", s.maxID), nil)
			if err != nil {
				return err
			}
		}
		_, _, err := tx.Set(fmtID("asset.", a.ID), string(raw), nil)
		return err
	})
}
func (s *BuntStore) DropAsset(id uint32) error {
	return s.Update(func(tx *buntdb.Tx) error {
		_, err := tx.Delete(fmtID("asset.", id))
		return err
	})
}
