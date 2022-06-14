package gamed

import (
	"fmt"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/lvl"
)

type EditLevel struct {
	ID ids.Lvl `json:"id"`
	EditGrid[lvl.Tile]
}

// Apply changes to world w with the given edit or returns an error.
func (e *EditLevel) Apply(w *lvl.World) error {
	// look up the level to edit
	l := w.Levels[e.ID]
	if l == nil {
		return fmt.Errorf("no level with id %d", e.ID)
	}
	return e.EditGrid.Apply(geo.Box{Dim: w.Dim}, &l.Tiles)
}
