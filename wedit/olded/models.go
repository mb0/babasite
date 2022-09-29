package olded

import (
	"fmt"
	"strconv"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/lvl"
	"github.com/mb0/babasite/game/pix"
)

type Tset struct {
	ID    ids.Tset   `json:"id"`
	Name  string     `json:"name"`
	Infos []TileInfo `json:"infos"`
}

type TileInfo struct {
	Tile  lvl.Tile `json:"tile"`
	Name  string   `json:"name"`
	Color uint32   `json:"color"`
	Block bool     `json:"block,omitempty"`
	Group string   `json:"group,omitempty"`
	Asset string   `json:"asset,omitempty"`
}

type WorldInfo struct {
	Name    string `json:"name"`
	Tileset string `json:"tileset"`
	geo.Dim
	Levels []*LevelInfo `json:"levels"`
}

type World struct {
	WorldInfo
	Tileset *Tset              `json:"tileset"`
	Levels  map[ids.Lvl]*Level `json:"levels"`
}

type LevelInfo struct {
	ID      ids.Lvl  `json:"id"`
	Name    string   `json:"name"`
	Tileset ids.Tset `json:"tileset"`
}

type Level struct {
	LevelInfo
	grid.Tiles[lvl.Tile]
}

type Pal struct {
	ID    ids.Pal `json:"id"`
	Name  string  `json:"name"`
	Kind  string  `json:"kind"`
	Feats []*Feat `json:"feat"`
}

func (pal *Pal) Feat(name string) *Feat {
	for _, f := range pal.Feats {
		if f.Name == name {
			return f
		}
	}
	return nil
}

type Color uint32
type Feat struct {
	Name   string  `json:"name"`
	Colors []Color `json:"colors"`
}

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

// Seq is a named sequence of frames for animation.
type Seq struct {
	Name string    `json:"name"`
	IDs  []ids.Pic `json:"ids,omitempty"`
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

type Pic struct {
	ID ids.Pic `json:"id"`
	pix.Pix
}

func (c Color) MarshalText() ([]byte, error) {
	return []byte(fmt.Sprintf("%06x", c)), nil
}
func (c *Color) UnmarshalText(raw []byte) error {
	u, err := strconv.ParseUint(string(raw), 16, 32)
	*c = Color(u)
	return err
}
