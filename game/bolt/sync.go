package bolt

import (
	"fmt"

	"github.com/mb0/babasite/game/ids"
	"go.etcd.io/bbolt"
)

type ListSync[ID ids.ID, T any, D ids.Dec[T]] ids.ListTable[ID, T, D]

func NewListSync[ID ids.ID, T any, D ids.Dec[T]](t *ids.ListTable[ID, T, D]) *ListSync[ID, T, D] {
	return (*ListSync[ID, T, D])(t)
}

func (s *ListSync[ID, T, D]) Load(tx Src) error {
	b := tx.Bucket([]byte(ID(0).Top()))
	if b == nil {
		return nil
	}
	max := uint32(b.Sequence())
	if max > 0 {
		s.List = make([]ids.Slot[T, D], max)
	}
	return loadTable(b, func(id uint32, raw []byte) error {
		idx := int(id) - 1
		if idx < 0 || idx >= len(s.List) {
			return fmt.Errorf("unexpected id %d with seq %d, idx %d len %d", id, max, idx, len(s.List))
		}
		return D(&s.List[idx].Data).UnmarshalBinary(raw)
	})
}

func (s *ListSync[ID, T, D]) Dirty() bool {
	return s.Mods > 0
}

func (s *ListSync[ID, T, D]) Sync(tx Src) error {
	if s.Mods == 0 {
		return nil
	}
	b, err := tx.CreateBucketIfNotExists([]byte(ID(0).Top()))
	if err != nil {
		return err
	}
	seq := uint64(len(s.List))
	old := b.Sequence()
	if seq > old || s.Mods > 0 {
		err = syncTable[T, D](b, (*ids.ListTable[ID, T, D])(s))
		if err != nil {
			return err
		}
	}
	if old != seq {
		err = b.SetSequence(seq)
	}
	s.Mods = 0
	return err
}

func (s *ListSync[ID, T, D]) Save(tx Src) error {
	return saveTable[ID, T, D](tx, (*ids.ListTable[ID, T, D])(s))
}

type HashSync[ID ids.ID, T any, D ids.Dec[T]] ids.HashTable[ID, T, D]

func (s *HashSync[ID, T, D]) Load(tx Src) error {
	b := tx.Bucket([]byte(ID(0).Top()))
	if b == nil {
		return nil
	}
	s.Max = ID(b.Sequence())
	s.Map = make(map[ID]*ids.Slot[T, D], s.Max)
	return loadTable(b, func(id uint32, raw []byte) error {
		var sl ids.Slot[T, D]
		s.Map[ID(id)] = &sl
		return D(&sl.Data).UnmarshalBinary(raw)
	})
}

func (s *HashSync[ID, T, D]) Dirty() bool {
	return s.Mods > 0
}

func (s *HashSync[ID, T, D]) Sync(tx Src) error {
	if s.Mods == 0 {
		return nil
	}
	b, err := tx.CreateBucketIfNotExists([]byte(ID(0).Top()))
	if err != nil {
		return err
	}
	seq := uint64(s.Max)
	old := b.Sequence()
	if seq > old || s.Mods > 0 {
		err = syncTable[T, D](b, (*ids.HashTable[ID, T, D])(s))
		if err != nil {
			return err
		}
	}
	if old != seq {
		err = b.SetSequence(seq)
	}
	s.Mods = 0
	return err
}

func (s *HashSync[ID, T, D]) Save(tx Src) error {
	return saveTable[ID, T, D](tx, (*ids.HashTable[ID, T, D])(s))
}

func loadTable(b *bbolt.Bucket, ins func(uint32, []byte) error) error {
	return b.ForEach(func(k, raw []byte) error {
		if len(k) != 8 || k[0] == '_' {
			return nil
		}
		id, err := ReadID(k)
		if err != nil {
			return err
		}
		return ins(id, raw)
	})
}

type table[T any, D ids.Dec[T]] interface {
	Each(func(uint32, *ids.Slot[T, D]) error) error
}

func saveTable[ID ids.ID, T any, D ids.Dec[T]](tx Src, data table[T, D]) error {
	top := []byte(ID(0).Top())
	if old := tx.Bucket(top); old != nil {
		tx.DeleteBucket(top)
	}
	b, err := tx.CreateBucket(top)
	if err != nil {
		return err
	}
	var max uint32
	err = data.Each(func(id uint32, s *ids.Slot[T, D]) error {
		if id > max {
			max = id
		}
		if s.Empty() {
			return nil
		}
		val, err := D(&s.Data).MarshalBinary()
		if err != nil {
			return err
		}
		return b.Put(WriteID(id), val)
	})
	if err != nil {
		return err
	}
	return b.SetSequence(uint64(max))
}

func syncTable[T any, D ids.Dec[T]](b *bbolt.Bucket, data table[T, D]) error {
	return data.Each(func(id uint32, s *ids.Slot[T, D]) error {
		if s.Sync == 0 {
			return nil
		}
		key := WriteID(id)
		if s.Empty() {
			err := b.Delete(key)
			if err != nil {
				return err
			}
		} else {
			val, err := D(&s.Data).MarshalBinary()
			if err != nil {
				return err
			}
			err = b.Put(key, val)
			if err != nil {
				return err
			}
		}
		s.Sync = 0
		return nil
	})
}
