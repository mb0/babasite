package gamed

import (
	"fmt"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/pix"
)

type EditPic struct {
	Pic pix.PicID `json:"pic"`
	EditGrid[pix.Pixel]
}

// Apply changes asset a with the given edit or returns an error.
func (e *EditPic) Apply(a *pix.Asset) error {
	// look up the pic to edit
	pic := a.Pics[e.Pic]
	if pic == nil {
		return fmt.Errorf("no picture with id %d", e.Pic)
	}
	return e.EditGrid.Apply(geo.Box{Dim: a.Dim}, &pic.Pix)
}
