package ids

import (
	"encoding"
	"fmt"
)

var ErrNotFound = fmt.Errorf("not found")

type Dec[T any] interface {
	*T
	encoding.BinaryMarshaler
	encoding.BinaryUnmarshaler
}

type Cond[T any, D Dec[T]] func(D) bool

type Table[I ID, T any, D Dec[T]] interface {
	NewID() (I, error)
	Get(I) (D, error)
	Set(I, D) error
	All(Cond[T, D]) []D
}

type ListTable[I ID, T any, D Dec[T]] struct {
	List []D
	Mod  map[I]bool
}

func (lt *ListTable[I, T, D]) NewID() (I, error) {
	lt.List = append(lt.List, nil)
	return I(len(lt.List)), nil
}

func (lt *ListTable[I, T, D]) New() (I, error) {
	lt.List = append(lt.List, nil)
	return I(len(lt.List)), nil
}

func (lt *ListTable[I, T, D]) Get(id I) (d D, _ error) {
	idx := int(id) - 1
	if idx < 0 || idx >= len(lt.List) {
		return nil, ErrNotFound
	}
	d = lt.List[idx]
	if d == nil {
		return nil, ErrNotFound
	}
	return d, nil
}

func (lt *ListTable[I, T, D]) Set(id I, d D) error {
	idx := int(id) - 1
	if idx < 0 || idx >= len(lt.List) {
		return ErrNotFound
	}
	lt.List[idx] = d
	lt.Mark(id, d != nil)
	return nil
}

func (lt *ListTable[I, T, D]) All(c Cond[T, D]) []D {
	res := make([]D, 0, len(lt.List))
	for _, d := range lt.List {
		if d != nil && (c == nil || c(d)) {
			res = append(res, d)
		}
	}
	return res
}
func (lt *ListTable[I, T, D]) Mark(id I, mod bool) {
	if lt.Mod == nil {
		lt.Mod = make(map[I]bool)
	}
	lt.Mod[id] = mod
}
