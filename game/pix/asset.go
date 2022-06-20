package pix

import (
	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/ids"
)

type AssetInfo struct {
	Name string `json:"name"`
	Kind string `json:"kind"`
	geo.Dim
	Seq []*Seq `json:"seq"`
	Pal string `json:"pal"`
}

func (a *AssetInfo) GetSeq(name string) *Seq {
	for _, s := range a.Seq {
		if s.Name == name {
			return s
		}
	}
	return nil
}

func (a *AssetInfo) AddSeq(name string) *Seq {
	if s := a.GetSeq(name); s != nil {
		return s
	}
	s := &Seq{Name: name}
	a.Seq = append(a.Seq, s)
	return s
}

type Asset struct {
	AssetInfo
	Pics map[ids.Pic]*Pic `json:"pics"`
	Last ids.Pic          `json:"-"`
}

func NewAsset(info AssetInfo) *Asset {
	return &Asset{AssetInfo: info, Pics: make(map[ids.Pic]*Pic)}
}

func (a *Asset) GetPics(is ...ids.Pic) []*Pic {
	pics := make(map[ids.Pic]bool, len(is))
	res := make([]*Pic, 0, len(is))
	for _, id := range is {
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
