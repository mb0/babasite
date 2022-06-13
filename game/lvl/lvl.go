package lvl

import (
	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
)

type Tile uint16

type LevelID uint

type LevelInfo struct {
	ID   LevelID `json:"id"`
	Name string  `json:"name"`
}

type Level struct {
	LevelInfo
	grid.Tiles[Tile]
	// we want a map to all object properties on this level like position, asset and so on.
}

type WorldInfo struct {
	Name    string `json:"name"`
	Tileset string `json:"tileset"`
	geo.Dim
	Levels []*LevelInfo `json:"levels"`
}

type World struct {
	WorldInfo
	Tileset *Tileset           `json:"tileset"`
	Levels  map[LevelID]*Level `json:"levels"`
	// we want a map to all generic object states on the map
	// we can use the object states to document and configure initial map states and
	// also to later save game states.
	// here go more details like level connections and scripting stuff.
}

func NewWorld(name string, d geo.Dim, set *Tileset) *World {
	var l Level
	l.ID = 1
	l.Dim = d
	l.Raw = make([]uint16, d.W*d.H)
	info := WorldInfo{Name: name, Tileset: set.Name, Dim: d}
	return &World{WorldInfo: info, Levels: map[LevelID]*Level{1: &l}, Tileset: set}
}

func (w *World) NewLevel() (l *Level) {
	id := LevelID(len(w.Levels))
	for {
		if _, ok := w.Levels[id]; ok {
			id++
			continue
		}
		break
	}
	l = &Level{}
	l.ID = id
	w.Levels[id] = l
	return l
}
