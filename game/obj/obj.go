// Package obj provides tools to work with game entities.
package obj

import (
	"encoding/json"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/pfind"
)

type Obj struct {
	ID  ids.Obj `json:"id"`
	Lvl ids.Lvl `json:"lvl,omitempty"`
	geo.Box
	Asset ids.Asset `json:"asset,omitempty"`
	// specific components:
	// info for obj that can be inspected
	Info *Info `json:"info,omitempty"`
	// path of moving object like the player
	Path *pfind.Path `json:"path,omitempty"`
	// loot inventory id of lootable items
	Loot ids.Inv `json:"loot,omitempty"`
	// dialog id for items with a dialog
	Dia ids.Dia `json:"dia,omitempty"`
}

type Info struct {
	Name string `json:"name"`
	Text string `json:"text,omitempty"`
}

func (*Obj) New(id uint32) *Obj                 { return &Obj{ID: ids.Obj(id)} }
func (o *Obj) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, o) }
func (o *Obj) MarshalBinary() ([]byte, error)   { return json.Marshal(o) }
