package maped

import (
	"fmt"
	"regexp"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
)

var NameCheck = regexp.MustCompile(`^[a-z0-9_]+$`)

type Tile uint16

type Level struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	grid.Tiles[Tile]
	// we want a map to all object properties on this level like position, asset and so on.
}

type MapInfo struct {
	Name    string `json:"name"`
	Tileset string `json:"tileset"`
	geo.Dim
}

type TileMap struct {
	MapInfo
	Levels map[int]*Level `json:"levels"`
	// we want a map to all generic object states on the map
	// we can use the object states to document and configure initial map states and
	// also to later save game states.
	// here go more details like level connections and scripting stuff.
}

func NewTileMap(name string, d geo.Dim, set string) *TileMap {
	var l Level
	l.Dim = d
	l.Raw = make([]uint16, d.W*d.H)
	info := MapInfo{Name: name, Tileset: set, Dim: d}
	return &TileMap{MapInfo: info, Levels: map[int]*Level{0: &l}}
}

func (tm *TileMap) NewLevel() (l *Level) {
	id := len(tm.Levels)
	for {
		if _, ok := tm.Levels[id]; ok {
			id++
			continue
		}
		break
	}
	l = &Level{ID: id}
	tm.Levels[id] = l
	return l
}

type TileInfo struct {
	Tile  Tile   `json:"tile"`
	Name  string `json:"name"`
	Color uint32 `json:"color"`
	Block bool   `json:"block"`
}

type Tileset struct {
	Name  string     `json:"name"`
	Infos []TileInfo `json:"infos"`
}

var DefaultTileset = Tileset{Name: "default", Infos: []TileInfo{
	{Tile: 0, Name: "void", Color: 0xffffff, Block: true},
	{Tile: 1, Name: "water", Color: 0x0000ff, Block: true},
	{Tile: 2, Name: "lava", Color: 0xff0000, Block: true},
	{Tile: 3, Name: "wall", Color: 0x888888, Block: true},
	{Tile: 10, Name: "dirt", Color: 0x92865f},
	{Tile: 11, Name: "grass", Color: 0x718144},
	{Tile: 12, Name: "path", Color: 0xb4ac88},
	{Tile: 13, Name: "street", Color: 0x505158},
	{Tile: 100, Name: "door", Block: true},
	{Tile: 200, Name: "window", Block: true},
	{Tile: 300, Name: "crate", Block: true},
	{Tile: 400, Name: "chest", Block: true},
	{Tile: 500, Name: "locker", Block: true},
}}

type EditLevel struct {
	ID   int   `json:"id"`
	Copy bool  `json:"copy,omitempty"`
	Repl bool  `json:"repl,omitempty"`
	Fill *Tile `json:"fill,omitempty"`
	grid.Data
}

// Apply changes to tile map tm with the given edit or returns an error.
func Apply(tm *TileMap, e EditLevel) error {
	d := geo.Box{Dim: tm.Dim}
	b := d.Crop(e.Box)
	if b.Empty() {
		return fmt.Errorf("edit selection empty")
	}
	// first look up the level to edit
	lvl := tm.Levels[e.ID]
	if lvl == nil {
		return fmt.Errorf("no level with id %d", e.ID)
	}
	if e.Repl {
		lvl.Box = b
		lvl.Raw = make([]uint16, b.W*b.H)
	} else if !b.In(lvl.Box) { // we need to grow
		var tmp grid.Tiles[Tile]
		tmp.Box = lvl.Grow(b)
		tmp.Raw = make([]uint16, tmp.W*tmp.H)
		grid.Each[Tile](&lvl.Tiles, tmp.Set)
		lvl.Tiles = tmp
	}
	if e.Fill != nil { // treat as selection to fill
		if len(e.Raw) != 0 {
			sel := &grid.Sel{Data: e.Data}
			grid.EachInNot[bool](sel, b, func(p geo.Pos, _ bool) {
				lvl.Set(p, *e.Fill)
			}, false)
		} else {
			grid.EachIn[Tile](lvl, e.Box, func(p geo.Pos, _ Tile) {
				lvl.Set(p, *e.Fill)
			})
		}
	} else { // treat the data as pixels
		pix := &grid.Tiles[Tile]{Data: e.Data}
		grid.EachIn[Tile](pix, b, func(p geo.Pos, v Tile) {
			if e.Copy || v != 0 {
				lvl.Set(p, v)
			}
		})
	}
	return nil
}
