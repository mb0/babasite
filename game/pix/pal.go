package pix

import (
	"encoding/json"

	"github.com/mb0/babasite/game/ids"
)

type Pal struct {
	ID    ids.Pal `json:"id"`
	Name  string  `json:"name"`
	Kind  string  `json:"kind"`
	Feats []*Feat `json:"feats"`
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

func (*Pal) Make(id uint32) Pal                 { return Pal{ID: ids.Pal(id)} }
func (p *Pal) UID() uint32                      { return uint32(p.ID) }
func (p *Pal) Named() string                    { return p.Name }
func (p *Pal) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, p) }
func (p *Pal) MarshalBinary() ([]byte, error)   { return json.Marshal(p) }
