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
	Syncs []Sync
}

func MakeWorldSync(w *game.World) WorldSync {
	return WorldSync{World: w, Syncs: []Sync{
		(*ObjSync)(&w.Obj),
		(*InvSync)(&w.Inv),
		(*DiaSync)(&w.Dia),
		(*PixSync)(&w.Pix),
		(*LvlSync)(&w.Lvl),
	}}
}

func (s *WorldSync) Load(tx Src) error {
	key := writeWorldKey(s.Name)
	b := tx.Bucket(key)
	if b == nil {
		return fmt.Errorf("world %q not found", s.Name)
	}
	for _, s := range s.Syncs {
		if err := s.Load(b); err != nil {
			return fmt.Errorf("sync %T: %v", s, err)
		}
	}
	return nil
}

func (s *WorldSync) Dirty() bool {
	for _, s := range s.Syncs {
		if s.Dirty() {
			return true
		}
	}
	return false
}

func (s *WorldSync) Sync(tx Src) error {
	key := writeWorldKey(s.Name)
	b, err := tx.CreateBucketIfNotExists(key)
	if err != nil {
		return err
	}
	for _, sub := range s.Syncs {
		if sub.Dirty() {
			if err := sub.Sync(b); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *WorldSync) Save(tx Src) error {
	key := writeWorldKey(s.Name)
	b, err := tx.CreateBucketIfNotExists(key)
	if err != nil {
		return err
	}
	for _, s := range s.Syncs {
		if err := s.Save(b); err != nil {
			return err
		}
	}
	return nil
}

func writeWorldKey(name string) []byte {
	key := make([]byte, 0, 2+len(name))
	key = append(key, "w~"...)
	key = append(key, name...)
	return key
}
