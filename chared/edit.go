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

func (pic *Sel) Draw(e Sel, cp bool) {
	if e.Empty() {
		return
	}
	if pic.Box == e.Box { // simple case same box
		if cp {
			copy(pic.Raw, e.Raw)
			return
		}
		for i, p := range e.Raw {
			if p != 0 {
				if p == 99 {
					p = 0
				}
				pic.Raw[i] = p
			}
		}
		return
	}
	if !e.In(pic.Box) { // we need to grow
		var tmp Sel
		tmp.Box = pic.Grow(e.Box)
		tmp.Raw = make([]uint16, tmp.W*tmp.H)
		tmp.Draw(*pic, true)
		*pic = tmp
	}
	// we can calculate
	for i, p := range e.Raw {
		if cp || p != 0 {
			x := i%e.W + e.X
			y := i/e.W + e.Y
			if p == 99 {
				p = 0
			}
			pic.Raw[(y-pic.Y)*pic.W+x-pic.X] = p
		}
	}
}

type EditPic struct {
	Pic  int  `json:"pic"`
	Copy bool `json:"copy,omitempty"`
	Sel
}

// Apply changes asset a with the given edit or returns an error.
func Apply(a *Asset, e EditPic) error {
	// TODO validate edit
	b := geo.Box{Dim: a.Dim}
	if !e.Sel.In(b) {
		return fmt.Errorf("edit selection invalid")
	}
	// first look up the pic to edit
	pic := a.Pics[e.Pic]
	if pic == nil {
		return fmt.Errorf("no picture with id %d", e.Pic)
	}
	pic.Sel.Draw(e.Sel, e.Copy)
	return nil
}
