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
	New(id uint32) *T
	encoding.BinaryMarshaler
	encoding.BinaryUnmarshaler
}

type Slot[T any, D Dec[T]] struct {
	Sync SyncFlag
	Data D
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
	lt.List = append(lt.List, Slot[T, D]{})
	sl := &lt.List[len(lt.List)-1]
	sl.Data = D(nil).New(uint32(len(lt.List)))
	sl.Sync = SyncAdd
	return sl.Data, nil
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
	if s == nil || s.Data == nil {
		return nil, ErrNotFound
	}
	return s.Data, nil
}

func (lt *ListTable[I, T, D]) Set(id I, d D) error {
	s := lt.Slot(id)
	if s == nil {
		return ErrNotFound
	}
	if s.Data == nil {
		if d != nil {
			s.Sync |= SyncAdd
		}
	} else if d == nil {
		s.Sync = SyncDel
	} else {
		s.Sync = SyncMod
	}
	s.Data = d
	return nil
}

func (lt *ListTable[I, T, D]) All(c Cond[T, D]) []D {
	res := make([]D, 0, len(lt.List))
	for _, s := range lt.List {
		if s.Data != nil && (c == nil || c(s.Data)) {
			res = append(res, s.Data)
		}
	}
	return res
}

func (lt *ListTable[I, T, D]) Find(c Cond[T, D]) D {
	for _, s := range lt.List {
		if s.Data != nil && c(s.Data) {
			return s.Data
		}
	}
	return nil
}
func (lt *ListTable[I, T, D]) Mark(id I, mod bool) {
	s := lt.Slot(id)
	if s != nil {
		if mod {
			s.Sync = SyncMod
		} else {
			s.Sync = SyncDel
		}
	}
}
