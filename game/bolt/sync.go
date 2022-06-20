package bolt

import (
	"fmt"

	"github.com/mb0/babasite/game/ids"
)

func LoadTable[ID ids.ID, T any, D ids.Dec[T]](tx Src, data *ids.ListTable[ID, T, D]) error {
	b := tx.Bucket([]byte(ID(0).Top()))
	if b == nil {
		return nil
	}
	max := uint32(b.Sequence())
	if max > 0 {
		data.List = make([]ids.Slot[T, D], max)
	}
	return b.ForEach(func(k, raw []byte) error {
		if len(k) != 8 || k[0] == '_' {
			return nil
		}
		id, err := ReadID(k)
		if err != nil {
			return err
		}
		idx := int(id) - 1
		if idx < 0 || idx >= len(data.List) {
			return fmt.Errorf("unexpected id %d with seq %d, idx %d len %d", id, max, idx, len(data.List))
		}
		err = D(&data.List[idx].Data).UnmarshalBinary(raw)
		if err != nil {
			return err
		}
		return nil
	})
}

func SaveTable[ID ids.ID, T any, D ids.Dec[T]](tx Src, data *ids.ListTable[ID, T, D]) error {
	top := []byte(ID(0).Top())
	if old := tx.Bucket(top); old != nil {
		tx.DeleteBucket(top)
	}
	b, err := tx.CreateBucket(top)
	if err != nil {
		return err
	}
	for idx := range data.List {
		d := &data.List[idx]
		if d.Empty() {
			continue
		}
		val, err := D(&d.Data).MarshalBinary()
		if err != nil {
			return err
		}
		key := WriteID(uint32(idx + 1))
		err = b.Put(key, val)
		if err != nil {
			return err
		}
	}
	return b.SetSequence(uint64(len(data.List)))
}

func SyncTable[ID ids.ID, T any, D ids.Dec[T]](tx Src, data *ids.ListTable[ID, T, D]) error {
	b, err := tx.CreateBucketIfNotExists([]byte(ID(0).Top()))
	if err != nil {
		return err
	}
	seq := uint64(len(data.List))
	old := b.Sequence()
	if seq > old || data.Mods > 0 {
		for idx := range data.List {
			sl := &data.List[idx]
			if sl.Sync == 0 {
				continue
			}
			id := ID(idx + 1)
			key := WriteID(uint32(id))
			if sl.Empty() {
				err := b.Delete(key)
				if err != nil {
					return err
				}
			} else {
				val, err := D(&sl.Data).MarshalBinary()
				if err != nil {
					return err
				}
				err = b.Put(key, val)
				if err != nil {
					return err
				}
			}
			sl.Sync = 0
		}
	}
	if old != seq {
		err = b.SetSequence(seq)
	}
	return err
}
