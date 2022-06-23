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
func (l *Lvl) Named() string                    { return l.Name }
func (l *Lvl) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, l) }
func (l *Lvl) MarshalBinary() ([]byte, error)   { return json.Marshal(l) }
