// Package obj provides tools to work with game entities.
package obj

import (
	"encoding/json"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/ids"
)

type Info struct {
	ID ids.Info `json:"id"`
	// internal name for development
	Name string `json:"name"`
	// img or clip to render, objects can be invisible e.g. areas to trigger an action
	Asset ids.Topic `json:"asset,omitempty"`
	// text info for obj that can be inspected
	Descr string `json:"descr,omitempty"`
	// dialog id for items with a dialog e.g. terminals or keypads
	Dia ids.Dia `json:"dia,omitempty"`
}

// Obj represents all things that can be positioned in levels.
type Obj struct {
	ID ids.Obj `json:"id"`
	// generic info
	Info ids.Info `json:"info"`
	// level position and dimension
	Lvl ids.Lvl `json:"lvl"`
	geo.Box
	// specific components:
	// loot inventory id of lootable items
	Loot ids.Inv `json:"loot,omitempty"`
}

func (*Info) Make(id uint32) Info                { return Info{ID: ids.Info(id)} }
func (o *Info) UID() uint32                      { return uint32(o.ID) }
func (o *Info) Named() string                    { return o.Name }
func (o *Info) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, o) }
func (o *Info) MarshalBinary() ([]byte, error)   { return json.Marshal(o) }

func (*Obj) Make(id uint32) Obj                 { return Obj{ID: ids.Obj(id)} }
func (o *Obj) UID() uint32                      { return uint32(o.ID) }
func (o *Obj) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, o) }
func (o *Obj) MarshalBinary() ([]byte, error)   { return json.Marshal(o) }
