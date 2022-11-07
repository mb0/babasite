package pix

import (
	"encoding/json"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/ids"
)

type Spot struct {
	ID    ids.Spot `json:"id"`
	Name  string   `json:"name"`
	Color uint32   `json:"color"`
	geo.Dim
}

func (*Spot) Make(id uint32) Spot                { return Spot{ID: ids.Spot(id)} }
func (s *Spot) UID() uint32                      { return uint32(s.ID) }
func (s *Spot) Named() string                    { return s.Name }
func (s *Spot) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, s) }
func (s *Spot) MarshalBinary() ([]byte, error)   { return json.Marshal(s) }

type Img struct {
	ID   ids.Img `json:"id"`
	Name string  `json:"name"`
	Kind string  `json:"kind"`
	geo.Dim
	Pal ids.Pal `json:"pal"`
}

func (*Img) Make(id uint32) Img                  { return Img{ID: ids.Img(id)} }
func (im *Img) UID() uint32                      { return uint32(im.ID) }
func (im *Img) Named() string                    { return im.Name }
func (im *Img) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, im) }
func (im *Img) MarshalBinary() ([]byte, error)   { return json.Marshal(im) }

// Clip is a named sequence of frames for animation.
type Clip struct {
	ID   ids.Clip `json:"id"`
	Name string   `json:"name"`
	Img  ids.Img  `json:"img"`
	geo.Dim
	Seq  []Frame `json:"seq"`
	Loop bool    `json:"loop,omitempty"`
}

// Frame represents a specific picture for a given duration.
type Frame struct {
	Pic   ids.Pic `json:"pic"`
	Dur   uint    `json:"dur,omitempty"`
	Marks []Mark  `json:"marks,omitempty"`
}

type Mark struct {
	ID ids.Spot `json:"id"`
	geo.Pos
}

func (*Clip) Make(id uint32) Clip                { return Clip{ID: ids.Clip(id)} }
func (c *Clip) UID() uint32                      { return uint32(c.ID) }
func (c *Clip) Named() string                    { return c.Name }
func (c *Clip) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, c) }
func (c *Clip) MarshalBinary() ([]byte, error)   { return json.Marshal(c) }
