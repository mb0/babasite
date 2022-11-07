package bolt

import (
	"fmt"

	"github.com/mb0/babasite/game"
	"go.etcd.io/bbolt"
)

func LoadWorldInfos(tx *bbolt.Tx) (res []string) {
	c := tx.Cursor()
	for k, _ := c.Seek([]byte("w~")); k != nil; k, _ = c.Next() {
		if len(k) < 3 || k[0] != 'w' || k[1] != '~' {
			break
		}
		res = append(res, string(k[2:]))
	}
	return res
}

type WorldSync struct {
	*game.World
	Syncs
}

func MakeWorldSync(w *game.World) WorldSync {
	return WorldSync{World: w, Syncs: Syncs{
		NewListSync(&w.Lvl.Tset),
		NewListSync(&w.Lvl.Lvl),
		NewListSync(&w.Lvl.Grid),

		NewListSync(&w.Pix.Pal),
		NewListSync(&w.Pix.Spot),
		NewListSync(&w.Pix.Img),
		NewListSync(&w.Pix.Clip),
		NewListSync(&w.Pix.Pic),

		NewListSync(&w.Obj.Info),
		NewListSync(&w.Obj.Obj),

		NewListSync(&w.Inv.Prod),
		NewListSync(&w.Inv.Item),
		NewListSync(&w.Inv.Inv),

		NewListSync(&w.Dia.Dia),
	}}
}

func (s *WorldSync) Load(tx Src) error {
	key := writeWorldKey(s.Name)
	b := tx.Bucket(key)
	if b == nil {
		return fmt.Errorf("world %q not found", s.Name)
	}
	return s.Syncs.Load(b)
}

func (s *WorldSync) Sync(tx Src) error {
	key := writeWorldKey(s.Name)
	b, err := tx.CreateBucketIfNotExists(key)
	if err != nil {
		return err
	}
	return s.Syncs.Sync(b)
}

func (s *WorldSync) Save(tx Src) error {
	key := writeWorldKey(s.Name)
	b, err := tx.CreateBucketIfNotExists(key)
	if err != nil {
		return err
	}
	return s.Syncs.Save(b)
}

func writeWorldKey(name string) []byte {
	key := make([]byte, 0, 2+len(name))
	key = append(key, "w~"...)
	key = append(key, name...)
	return key
}
