// Package obj provides tools to work with game entities.
package obj

import (
	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/inv"
	"github.com/mb0/babasite/game/pfind"
)

type ObjID uint16

type Obj struct {
	ID ObjID `json:"id"`
	geo.Box
	Asset string `json:"asset,omitempty"`
	// specific components:
	// info for obj that can be inspected
	Info *Info `json:"info,omitempty"`
	// path of moving object like the player
	Path *pfind.Path `json:"path,omitempty"`
	// loot inventory id of lootable items
	Loot inv.InvID `json:"loot,omitempty"`
}

type Info struct {
	Name string `json:"name"`
	Text string `json:"text,omitempty"`
}
