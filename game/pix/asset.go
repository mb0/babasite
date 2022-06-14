package pix

import "github.com/mb0/babasite/game/geo"

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

func (a *AssetInfo) AddSeq(name string, fr ...Frame) *Seq {
	if s := a.GetSeq(name); s != nil {
		return s
	}
	if fr == nil {
		fr = []Frame{}
	}
	s := &Seq{Name: name, Frames: fr}
	a.Seq = append(a.Seq, s)
	return s
}

type Asset struct {
	AssetInfo
	Pics map[PicID]*Pic `json:"pics"`
	Last PicID          `json:"-"`
}

func NewAsset(info AssetInfo) *Asset {
	return &Asset{AssetInfo: info, Pics: make(map[PicID]*Pic)}
}

func (a *Asset) GetPics(ids ...PicID) []*Pic {
	pics := make(map[PicID]bool, len(ids))
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
