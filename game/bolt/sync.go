package bolt

import "github.com/mb0/babasite/game/ids"

func LoadTable[ID ids.ID, T any, D ids.Dec[T]](tx Src, data *ids.ListTable[ID, T, D]) error {
	var zero ID
	b := tx.Bucket(zero.Topic())
	if b == nil {
		return nil
	}
	max := b.Sequence()
	if max > 0 {
		data.List = make([]D, b.Sequence()-1)
	}
	return b.ForEach(func(k, raw []byte) error {
		if len(k) != 8 || k[0] == '_' {
			return nil
		}
		id, err := ReadID(k)
		if err != nil {
			return err
		}
		if id < 1 || int(id) > len(data.List) {
			return ids.ErrNotFound
		}
		d := D(new(T))
		err = d.UnmarshalBinary(raw)
		if err != nil {
			return err
		}
		data.List[int(id)-1] = d
		return nil
	})
}

func SaveTable[ID ids.ID, T any, D ids.Dec[T]](tx Src, data *ids.ListTable[ID, T, D]) error {
	top := ID(0).Topic()
	if old := tx.Bucket(top); old != nil {
		tx.DeleteBucket(top)
	}
	b, err := tx.CreateBucket(top)
	if err != nil {
		return err
	}
	for idx, d := range data.List {
		if d == nil {
			continue
		}
		val, err := d.MarshalBinary()
		if err != nil {
			return err
		}
		key := WriteID(uint32(idx + 1))
		err = b.Put(key, val)
		if err != nil {
			return err
		}
	}
	return nil
}

func SyncTable[ID ids.ID, T any, D ids.Dec[T]](tx Src, data *ids.ListTable[ID, T, D]) error {
	var zero ID
	b, err := tx.CreateBucketIfNotExists(zero.Topic())
	if err != nil {
		return err
	}
	seq := uint64(len(data.List))
	old := b.Sequence()
	if seq > old || len(data.Mod) > 0 {
		for id, mod := range data.Mod {
			key := WriteID(uint32(id))
			if !mod {
				err := b.Delete(key)
				if err != nil {
					return err
				}
			} else {
				d, _ := data.Get(id)
				if d != nil {
					val, err := d.MarshalBinary()
					if err != nil {
						return err
					}
					err = b.Put(key, val)
					if err != nil {
						return err
					}
				}
			}
		}
	}
	if old != seq {
		err = b.SetSequence(seq)
	}
	return err
}
