package chared

import (
	"fmt"
)

type Pixel uint16

type Sel struct {
	Box
	Data []Pixel `json:"data"`
}

func (s Sel) Global(p Pos) Pixel {
	if !p.In(s.Box) {
		return 0
	}
	return s.Data[(p.Y-s.Y)*s.W+p.X-s.X]
}

func MakeSel(x, y, w, h int, pix ...Pixel) Sel {
	if n := w * h; len(pix) < n {
		old := pix
		pix = make([]Pixel, n)
		copy(pix, old)
	}
	return Sel{Box: MakeBox(x, y, w, h), Data: pix}
}

func (pic *Sel) Draw(e Sel, cp bool) {
	if e.Empty() {
		return
	}
	if pic.Box == e.Box { // simple case same box
		if cp {
			copy(pic.Data, e.Data)
			return
		}
		for i, p := range e.Data {
			if p != 0 {
				pic.Data[i] = p
			}
		}
		return
	}
	if !pic.Contains(e.Box) { // we need to grow
		tmp := &Sel{Box: pic.Grow(e.Box)}
		tmp.Data = make([]Pixel, tmp.W*tmp.H)
		tmp.Draw(*pic, true)
		*pic = *tmp
	}
	// we can calculate
	for i, p := range e.Data {
		if cp || p != 0 {
			x := i%e.W + e.X
			y := i/e.W + e.Y
			pic.Data[(y-pic.Y)*pic.W+x-pic.X] = p
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
	b := Box{Size: a.Size}
	if !b.ValidSel(e.Sel.Box) {
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
