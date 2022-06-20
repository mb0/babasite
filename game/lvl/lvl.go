package lvl

import (
	"encoding/binary"
	"encoding/json"
	"fmt"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
	"github.com/mb0/babasite/game/ids"
)

type Tile uint16

type Grid struct {
	ID ids.Grid `json:"id"`
	grid.Tiles[Tile]
}

type Lvl struct {
	ID   ids.Lvl `json:"id"`
	Name string  `json:"name"`
	geo.Dim
	Tset ids.Tset `json:"tset"`
	Grid ids.Grid `json:"grid"`
}

type LevelInfo struct {
	ID      ids.Lvl  `json:"id"`
	Name    string   `json:"name"`
	Tileset ids.Tset `json:"tileset"`
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
	Levels  map[ids.Lvl]*Level `json:"levels"`
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
	return &World{WorldInfo: info, Levels: map[ids.Lvl]*Level{1: &l}, Tileset: set}
}

func (w *World) NewLevel() (l *Level) {
	id := ids.Lvl(len(w.Levels))
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
func (*Grid) Make(id uint32) Grid { return Grid{ID: ids.Grid(id)} }
func (g *Grid) UID() uint32       { return uint32(g.ID) }
func (g *Grid) UnmarshalBinary(raw []byte) error {
	if len(raw) < 12 {
		return fmt.Errorf("short grid")
	}
	g.ID = ids.Grid(binary.BigEndian.Uint32(raw))
	return g.Data.UnmarshalBinary(raw[4:])
}
func (g *Grid) MarshalBinary() ([]byte, error) {
	data, _ := g.Data.MarshalBinary()
	b := make([]byte, 4, 4+len(data))
	binary.BigEndian.PutUint32(b, uint32(g.ID))
	return append(b, data...), nil
}

func (*Lvl) Make(id uint32) Lvl                 { return Lvl{ID: ids.Lvl(id)} }
func (l *Lvl) UID() uint32                      { return uint32(l.ID) }
func (l *Lvl) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, l) }
func (l *Lvl) MarshalBinary() ([]byte, error)   { return json.Marshal(l) }
