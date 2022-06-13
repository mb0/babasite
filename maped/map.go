package maped

import (
	"fmt"
	"regexp"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
	"github.com/mb0/babasite/game/lvl"
)

var NameCheck = regexp.MustCompile(`^[a-z0-9_]+$`)

var DefaultTileset = lvl.Tileset{Name: "default", Infos: []lvl.TileInfo{
	{Tile: 0, Name: "void", Color: 0xffffff, Block: true, Group: "basic"},
	{Tile: 1, Name: "wall", Color: 0x888888, Block: true, Group: "basic"},
}}

type EditLevel struct {
	ID   lvl.LevelID `json:"id"`
	Copy bool        `json:"copy,omitempty"`
	Repl bool        `json:"repl,omitempty"`
	Fill *lvl.Tile   `json:"fill,omitempty"`
	grid.Data
}

// Apply changes to world w with the given edit or returns an error.
func Apply(w *lvl.World, e EditLevel) error {
	d := geo.Box{Dim: w.Dim}
	b := d.Crop(e.Box)
	if b.Empty() {
		return fmt.Errorf("edit selection empty")
	}
	// first look up the level to edit
	l := w.Levels[e.ID]
	if l == nil {
		return fmt.Errorf("no level with id %d", e.ID)
	}
	if e.Repl {
		l.Box = b
		l.Raw = make([]uint16, b.W*b.H)
	} else if !b.In(l.Box) { // we need to grow
		var tmp grid.Tiles[lvl.Tile]
		tmp.Box = l.Grow(b)
		tmp.Raw = make([]uint16, tmp.W*tmp.H)
		grid.Each[lvl.Tile](&l.Tiles, tmp.Set)
		l.Tiles = tmp
	}
	if e.Fill != nil { // treat as selection to fill
		if len(e.Raw) != 0 {
			sel := &grid.Sel{Data: e.Data}
			grid.EachInNot[bool](sel, b, func(p geo.Pos, _ bool) {
				l.Set(p, *e.Fill)
			}, false)
		} else {
			grid.EachIn[lvl.Tile](l, e.Box, func(p geo.Pos, _ lvl.Tile) {
				l.Set(p, *e.Fill)
			})
		}
	} else { // treat the data as pixels
		pix := &grid.Tiles[lvl.Tile]{Data: e.Data}
		grid.EachIn[lvl.Tile](pix, b, func(p geo.Pos, v lvl.Tile) {
			if e.Copy || v != 0 {
				l.Set(p, v)
			}
		})
	}
	return nil
}
