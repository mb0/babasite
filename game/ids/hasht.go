package ids

type HashTable[I ID, T any, D Dec[T]] struct {
	Map  map[I]*Slot[T, D]
	Max  I
	Mods uint64
}

func (ht *HashTable[I, T, D]) From(top Topic) (id I) {
	if top.Top == id.Top() {
		id = I(top.ID)
	}
	return id
}

func (ht *HashTable[I, T, D]) Mark(SyncFlag) { ht.Mods++ }

func (ht *HashTable[I, T, D]) New() (D, error) {
	ht.Max++
	s := &Slot[T, D]{
		Sync: SyncAdd,
		Data: D(nil).Make(uint32(ht.Max)),
	}
	if ht.Map == nil {
		ht.Map = make(map[I]*Slot[T, D])
	}
	ht.Map[ht.Max] = s
	ht.Mods++
	return &s.Data, nil
}

func (ht *HashTable[I, T, D]) slot(id I) *Slot[T, D] {
	return ht.Map[id]
}

func (ht *HashTable[I, T, D]) Slot(id I) ModSlot[I, T, D] {
	return ModSlot[I, T, D]{ht, ht.slot(id)}
}

func (ht *HashTable[I, T, D]) Get(id I) (d D, _ error) {
	s := ht.slot(id)
	if s.Empty() {
		return nil, ErrNotFound
	}
	return &s.Data, nil
}

func (ht *HashTable[I, T, D]) Set(id I, d D) error {
	s := ht.slot(id)
	if s == nil {
		return ErrNotFound
	}
	if s.Empty() {
		if d == nil {
			delete(ht.Map, id)
			return nil
		}
		s.Data = *d
		s.Sync = SyncAdd
	} else if d != nil {
		s.Data = *d
		s.Sync = SyncMod
	} else {
		var zero T
		s.Data = zero
		s.Sync = SyncDel
	}
	ht.Mods++
	return nil
}

func (lt *HashTable[I, T, D]) Each(f func(uint32, *Slot[T, D]) error) error {
	for id, s := range lt.Map {
		err := f(uint32(id), s)
		if err != nil {
			return err
		}
	}
	return nil
}

func (ht *HashTable[I, T, D]) All(c Cond[T, D]) []D {
	res := make([]D, 0, len(ht.Map))
	for _, s := range ht.Map {
		if !s.Empty() && (c == nil || c(&s.Data)) {
			res = append(res, &s.Data)
		}
	}
	return res
}

func (ht *HashTable[I, T, D]) Find(c Cond[T, D]) D {
	for _, s := range ht.Map {
		if !s.Empty() && c(&s.Data) {
			return &s.Data
		}
	}
	return nil
}
