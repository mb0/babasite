package lvl

import (
	"encoding/json"

	"github.com/mb0/babasite/game/ids"
)

type Tileset struct {
	ID    ids.Tset   `json:"id"`
	Name  string     `json:"name"`
	Infos []TileInfo `json:"infos"`
}

type TileInfo struct {
	Tile  Tile      `json:"tile"`
	Name  string    `json:"name"`
	Color uint32    `json:"color"`
	Block bool      `json:"block,omitempty"`
	Group string    `json:"group,omitempty"`
	Asset ids.Asset `json:"asset,omitempty"`
}

func (*Tileset) Make(id uint32) Tileset              { return Tileset{ID: ids.Tset(id)} }
func (ts *Tileset) UID() uint32                      { return uint32(ts.ID) }
func (ts *Tileset) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, ts) }
func (ts *Tileset) MarshalBinary() ([]byte, error)   { return json.Marshal(ts) }
