package ids

import (
	"encoding"
	"fmt"
)

type SyncFlag uint64

const (
	SyncNone SyncFlag = iota
	SyncAdd
	SyncDel
	SyncMod
)

var ErrNotFound = fmt.Errorf("not found")

type Dec[T any] interface {
	*T
	UID() uint32
	Make(id uint32) T
	encoding.BinaryMarshaler
	encoding.BinaryUnmarshaler
}

type Slot[T any, D Dec[T]] struct {
	Sync SyncFlag
	Data T
}

func (sl *Slot[T, D]) Empty() bool {
	return sl == nil || D(&sl.Data).UID() == 0
}

type Cond[T any, D Dec[T]] func(D) bool

type ListTable[I ID, T any, D Dec[T]] struct {
	List []Slot[T, D]
	Mods uint64
}

func (lt *ListTable[I, T, D]) From(top Topic) (id I) {
	if top.Top == id.Top() {
		id = I(top.ID)
	}
	return id
}

func (lt *ListTable[I, T, D]) New() (D, error) {
	lt.List = append(lt.List, Slot[T, D]{
		Sync: SyncAdd,
		Data: D(nil).Make(uint32(len(lt.List) + 1)),
	})
	lt.Mods++
	return &lt.List[len(lt.List)-1].Data, nil
}

func (lt *ListTable[I, T, D]) Slot(id I) *Slot[T, D] {
	idx := int(id) - 1
	if idx < 0 || idx >= len(lt.List) {
		return nil
	}
	return &lt.List[idx]
}

func (lt *ListTable[I, T, D]) Get(id I) (d D, _ error) {
	s := lt.Slot(id)
	if s.Empty() {
		return nil, ErrNotFound
	}
	return &s.Data, nil
}

func (lt *ListTable[I, T, D]) Set(id I, d D) error {
	s := lt.Slot(id)
	if s == nil {
		return ErrNotFound
	}
	if s.Empty() {
		if d == nil {
			return nil
		}
		s.Data = *d
		lt.mark(s, SyncAdd)
	} else if d != nil {
		s.Data = *d
		lt.mark(s, SyncMod)
	} else {
		var zero T
		s.Data = zero
		lt.mark(s, SyncDel)
	}
	return nil
}

func (lt *ListTable[I, T, D]) All(c Cond[T, D]) []D {
	res := make([]D, 0, len(lt.List))
	for idx := range lt.List {
		if s := &lt.List[idx]; !s.Empty() && (c == nil || c(&s.Data)) {
			res = append(res, &s.Data)
		}
	}
	return res
}

func (lt *ListTable[I, T, D]) Find(c Cond[T, D]) D {
	for idx := range lt.List {
		if s := &lt.List[idx]; !s.Empty() && c(&s.Data) {
			return &s.Data
		}
	}
	return nil
}
func (lt *ListTable[I, T, D]) Mark(id I, sync SyncFlag) {
	if s := lt.Slot(id); s != nil {
		lt.mark(s, sync)
	}
}
func (lt *ListTable[I, T, D]) mark(s *Slot[T, D], sync SyncFlag) {
	lt.Mods++
	s.Sync = sync
}
