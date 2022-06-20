// Package pix provides models and helpers to work with paletted pixel graphics.
package pix

import (
	"encoding/binary"
	"fmt"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
	"github.com/mb0/babasite/game/ids"
)

// Pixel is numeric id into the palette.
type Pixel uint16

// Pix is a grid of pixels.
type Pix = grid.Tiles[Pixel]

func MakePix(x, y, w, h int, pix ...uint16) Pix {
	if n := w * h; len(pix) < n {
		old := pix
		pix = make([]uint16, n)
		copy(pix, old)
	}
	return Pix{Data: grid.Data{
		Box: geo.MakeBox(x, y, w, h),
		Raw: pix,
	}}
}

// Pic represents a picture as part of an asset.
type Pic struct {
	ID ids.Pic `json:"id"`
	Pix
}

func (*Pic) Make(id uint32) Pic { return Pic{ID: ids.Pic(id)} }
func (p *Pic) UID() uint32      { return uint32(p.ID) }
func (p *Pic) UnmarshalBinary(raw []byte) error {
	if len(raw) < 12 {
		return fmt.Errorf("short grid")
	}
	p.ID = ids.Pic(binary.BigEndian.Uint32(raw))
	return p.Pix.UnmarshalBinary(raw[4:])
}
func (p *Pic) MarshalBinary() ([]byte, error) {
	data, _ := p.Pix.MarshalBinary()
	b := make([]byte, 4, 4+len(data))
	binary.BigEndian.PutUint32(b, uint32(p.ID))
	return append(b, data...), nil
}

// Seq is a named sequence of frames for animation.
type Seq struct {
	Name string    `json:"name"`
	IDs  []ids.Pic `json:"ids,omitempty"`
}
