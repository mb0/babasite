// Package inv provides an item and inventory system.
package inv

import (
	"encoding/json"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/ids"
)

// Prod represents an abstract product or item type that has common attributes.
type Prod struct {
	ID   ids.Prod `json:"id"`
	Name string   `json:"name"`
	geo.Dim
	Asset ids.Topic `json:"asset,omitempty"`
	Text  string    `json:"text,omitempty"`
}

// Item is an unique instance of a product in an inventory.
type Item struct {
	ID   ids.Item `json:"id"`
	Prod ids.Prod `json:"prod"`
	Inv  ids.Inv  `json:"inv"`
	geo.Box
	Sub ids.Inv `json:"sub,omitempty"`
}

// Inv is an inventory or container for items.
type Inv struct {
	ID ids.Inv `json:"id"`
	geo.Dim
	Items []*Item `json:"-"`
	Sub   *Item   `json:"-"`
}

func (*Prod) Make(id uint32) Prod                { return Prod{ID: ids.Prod(id)} }
func (p *Prod) UID() uint32                      { return uint32(p.ID) }
func (p *Prod) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, p) }
func (p *Prod) MarshalBinary() ([]byte, error)   { return json.Marshal(p) }

func (*Item) Make(id uint32) Item                 { return Item{ID: ids.Item(id)} }
func (it *Item) UID() uint32                      { return uint32(it.ID) }
func (it *Item) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, it) }
func (it *Item) MarshalBinary() ([]byte, error)   { return json.Marshal(it) }

func (*Inv) Make(id uint32) Inv                   { return Inv{ID: ids.Inv(id)} }
func (inv *Inv) UID() uint32                      { return uint32(inv.ID) }
func (inv *Inv) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, inv) }
func (inv *Inv) MarshalBinary() ([]byte, error)   { return json.Marshal(inv) }
