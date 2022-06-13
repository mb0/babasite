// Package pix provides models and helpers to work with paletted pixel graphics.
package pix

import (
	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
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

// PicID is an asset scoped picture identifier.
type PicID uint

// Pic represents a picture as part of an asset.
type Pic struct {
	ID PicID `json:"id"`
	Pix
}

// Seq is a named sequence of frames for animation.
type Seq struct {
	Name   string  `json:"name"`
	Frames []Frame `json:"frames"`
	Loop   bool    `json:"loop,omitempty"`

	// deprecated
	IDs []PicID `json:"ids,omitempty"`
}

// Frame is shows a specific picture for a given duration.
type Frame struct {
	Pic PicID
	Dur uint
}
