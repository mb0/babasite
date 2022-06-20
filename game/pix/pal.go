package pix

import (
	"encoding/json"

	"github.com/mb0/babasite/game/ids"
)

type MapPal map[Pixel]Color

func (pal MapPal) Color(p Pixel) Color { return pal[p] }

type Pal struct {
	ID    ids.Pal `json:"id"`
	Name  string  `json:"name"`
	Kind  string  `json:"kind"`
	Feats []*Feat `json:"feat"`
}

func (pal *Pal) Color(p Pixel) Color {
	f, c := int(p/100), int(p%100)
	if f < len(pal.Feats) {
		feat := pal.Feats[f]
		if c < len(feat.Colors) {
			return feat.Colors[c]
		}
	}
	return 0
}

func (pal *Pal) Feat(name string) *Feat {
	for _, f := range pal.Feats {
		if f.Name == name {
			return f
		}
	}
	return nil
}

type Feat struct {
	Name   string  `json:"name"`
	Colors []Color `json:"colors"`
}

func (*Pal) New(id uint32) *Pal                 { return &Pal{ID: ids.Pal(id)} }
func (p *Pal) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, p) }
func (p *Pal) MarshalBinary() ([]byte, error)   { return json.Marshal(p) }
