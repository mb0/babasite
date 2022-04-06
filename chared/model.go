package chared

import (
	"regexp"

	"github.com/mb0/babasite/game/geom"
)

var NameCheck = regexp.MustCompile(`^[a-z0-9_]+$`)

type SeqMeta struct {
	Name string `json:"name"`
	IDs  []int  `json:"ids"`
}

type AssetMeta struct {
	Name string `json:"name"`
	Kind string `json:"kind"`
	geom.Dim
	Seq []*SeqMeta `json:"seq"`
	Pal string     `json:"pal"`
}

func (a *AssetMeta) GetSeq(name string) *SeqMeta {
	for _, s := range a.Seq {
		if s.Name == name {
			return s
		}
	}
	return nil
}

func (a *AssetMeta) AddSeq(name string, ids ...int) *SeqMeta {
	if s := a.GetSeq(name); s != nil {
		return s
	}
	if ids == nil {
		ids = []int{}
	}
	s := &SeqMeta{Name: name, IDs: ids}
	a.Seq = append(a.Seq, s)
	return s
}

type Pic struct {
	ID int `json:"id"`
	Sel
}

type Asset struct {
	AssetMeta
	Pics map[int]*Pic `json:"pics"`
	Last int          `json:"-"`
	Pal  *Pallette    `json:"pal"`
}

func (a *Asset) GetPics(ids ...int) []*Pic {
	pics := make(map[int]bool, len(ids))
	res := make([]*Pic, 0, len(ids))
	for _, id := range ids {
		_, ok := pics[id]
		if !ok {
			pics[id] = true
			res = append(res, a.Pics[id])
		}
	}
	return res
}

func (a *Asset) NewPic() *Pic {
	a.Last += 1
	p := &Pic{ID: a.Last}
	a.Pics[p.ID] = p
	return p
}

func DefaultSize(kind string) geom.Dim {
	switch kind {
	case "char":
		return geom.Dim{48, 48}
	case "item":
		return geom.Dim{64, 64}
	}
	return geom.Dim{16, 16}
}
