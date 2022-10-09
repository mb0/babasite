package lvl

import (
	"encoding/json"

	"github.com/mb0/babasite/game/ids"
)

// Ability is a bitmask with 16 movement kinds. We use it to decide whether a tile can be traversed.

// It should deprecate the block field.
type Ability uint16

type Tset struct {
	ID    ids.Tset   `json:"id"`
	Name  string     `json:"name"`
	Infos []TileInfo `json:"infos"`
}

type TileInfo struct {
	Tile Tile `json:"tile"`
	// Allow is a bitmask that indicates what ability is required to traverse to or over this
	// tile. It should deprecate the block field.
	Allow Ability   `json:"allow,omitempty"`
	Color uint32    `json:"color"`
	Name  string    `json:"name"`
	Block bool      `json:"block,omitempty"`
	Group string    `json:"group,omitempty"`
	Asset ids.Topic `json:"asset,omitempty"`
}

func (*Tset) Make(id uint32) Tset                 { return Tset{ID: ids.Tset(id)} }
func (ts *Tset) UID() uint32                      { return uint32(ts.ID) }
func (ts *Tset) Named() string                    { return ts.Name }
func (ts *Tset) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, ts) }
func (ts *Tset) MarshalBinary() ([]byte, error)   { return json.Marshal(ts) }
