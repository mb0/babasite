package chared

import (
	"fmt"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
)

type Pixel uint16

type Sel struct {
	grid.Tiles[Pixel]
}

func MakeSel(x, y, w, h int, pix ...uint16) Sel {
	if n := w * h; len(pix) < n {
		old := pix
		pix = make([]uint16, n)
		copy(pix, old)
	}
	return Sel{Tiles: grid.Tiles[Pixel]{Data: grid.Data{
		Box: geo.MakeBox(x, y, w, h),
		Raw: pix,
	}}}
}

type EditPic struct {
	Pic  int    `json:"pic"`
	Copy bool   `json:"copy,omitempty"`
	Repl bool   `json:"repl,omitempty"`
	Fill *Pixel `json:"fill,omitempty"`
	grid.Data
}

// Apply changes asset a with the given edit or returns an error.
func Apply(a *Asset, e EditPic) error {
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
		var tmp grid.Tiles[Pixel]
		tmp.Box = pic.Grow(b)
		tmp.Raw = make([]uint16, tmp.W*tmp.H)
		grid.Each[Pixel](&pic.Tiles, tmp.Set)
		pic.Tiles = tmp
	}
	if e.Fill != nil { // treat as selection to fill
		if len(e.Raw) != 0 {
			sel := &grid.Sel{Data: e.Data}
			grid.EachInNot[bool](sel, b, func(p geo.Pos, _ bool) {
				pic.Set(p, *e.Fill)
			}, false)
		} else {
			grid.EachIn[Pixel](pic, e.Box, func(p geo.Pos, _ Pixel) {
				pic.Set(p, *e.Fill)
			})
		}
	} else { // treat the data as pixels
		pix := &grid.Tiles[Pixel]{Data: e.Data}
		grid.EachIn[Pixel](pix, b, func(p geo.Pos, v Pixel) {
			if e.Copy || v != 0 {
				pic.Set(p, v)
			}
		})
	}
	return nil
}
