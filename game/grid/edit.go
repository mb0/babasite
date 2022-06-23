package grid

import (
	"fmt"

	"github.com/mb0/babasite/game/geo"
)

type Edit[T ~uint16] struct {
	Copy bool `json:"copy,omitempty"`
	Repl bool `json:"repl,omitempty"`
	Fill *T   `json:"fill,omitempty"`
	Data
}

// Apply changes to dst with the given edit or returns an error.
func (e *Edit[T]) Apply(d geo.Box, dst *Tiles[T]) error {
	b := d.Crop(e.Box)
	if b.Empty() {
		return fmt.Errorf("edit selection empty")
	}
	if dst == nil {
		return fmt.Errorf("no destination")
	}
	if e.Repl {
		dst.Box = b
		dst.Raw = make([]uint16, b.W*b.H)
	} else if !b.In(dst.Box) { // we need to grow
		var tmp Tiles[T]
		tmp.Box = dst.Grow(b)
		tmp.Raw = make([]uint16, tmp.W*tmp.H)
		Each[T](dst, tmp.Set)
		*dst = tmp
	}
	if e.Fill != nil { // treat as selection to fill
		if len(e.Raw) != 0 {
			sel := &Sel{Data: e.Data}
			EachInNot[bool](sel, b, func(p geo.Pos, _ bool) {
				dst.Set(p, *e.Fill)
			}, false)
		} else {
			EachIn[T](dst, e.Box, func(p geo.Pos, _ T) {
				dst.Set(p, *e.Fill)
			})
		}
	} else { // treat the data as pixels
		pix := &Tiles[T]{Data: e.Data}
		EachIn[T](pix, b, func(p geo.Pos, v T) {
			if e.Copy || v != 0 {
				dst.Set(p, v)
			}
		})
	}
	return nil
}
