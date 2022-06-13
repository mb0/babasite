package chared

import (
	"fmt"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
	"github.com/mb0/babasite/game/pix"
)

type EditPic struct {
	Pic  pix.PicID  `json:"pic"`
	Copy bool       `json:"copy,omitempty"`
	Repl bool       `json:"repl,omitempty"`
	Fill *pix.Pixel `json:"fill,omitempty"`
	grid.Data
}

// Apply changes asset a with the given edit or returns an error.
func Apply(a *pix.Asset, e EditPic) error {
	d := geo.Box{Dim: a.Dim}
	b := d.Crop(e.Box)
	if b.Empty() {
		return fmt.Errorf("edit selection empty")
	}
	// first look up the pic to edit
	pic := a.Pics[e.Pic]
	if pic == nil {
		return fmt.Errorf("no picture with id %d", e.Pic)
	}
	if e.Repl {
		pic.Box = b
		pic.Raw = make([]uint16, b.W*b.H)
	} else if !b.In(pic.Box) { // we need to grow
		var tmp pix.Pix
		tmp.Box = pic.Grow(b)
		tmp.Raw = make([]uint16, tmp.W*tmp.H)
		grid.Each[pix.Pixel](&pic.Pix, tmp.Set)
		pic.Pix = tmp
	}
	if e.Fill != nil { // treat as selection to fill
		if len(e.Raw) != 0 {
			sel := &grid.Sel{Data: e.Data}
			grid.EachInNot[bool](sel, b, func(p geo.Pos, _ bool) {
				pic.Set(p, *e.Fill)
			}, false)
		} else {
			grid.EachIn[pix.Pixel](pic, e.Box, func(p geo.Pos, _ pix.Pixel) {
				pic.Set(p, *e.Fill)
			})
		}
	} else { // treat the data as pixels
		px := &pix.Pix{Data: e.Data}
		grid.EachIn[pix.Pixel](px, b, func(p geo.Pos, v pix.Pixel) {
			if e.Copy || v != 0 {
				pic.Set(p, v)
			}
		})
	}
	return nil
}
