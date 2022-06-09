// Package inv provides an item and inventory system.
package inv

import "github.com/mb0/babasite/game/geo"

// AssetPath is a text that identifies an asset and optionally a sequence. eg. "items/keycard".
type AssetPath string

// IDs are consecutive positive numbers valid within an inventory system.
// The zero value does represent a null instance.
type (
	ProdID uint
	ItemID uint
	InvID  uint
)

// Prod represents an abstract product or item type that has common attributes.
type Prod struct {
	ID   ProdID `json:"id"`
	Name string `json:"name"`
	geo.Dim
	Asset AssetPath `json:"asset,omitempty"`
	Text  string    `json:"text,omitempty"`
}

// Item is an unique instance of a product in an inventory.
type Item struct {
	ID   ItemID `json:"id"`
	Prod ProdID `json:"prod"`
	Inv  InvID  `json:"inv"`
	geo.Pos
	Sub InvID `json:"sub,omitempty"`
}

// Inv is an inventory or container for items.
type Inv struct {
	ID InvID `json:"id"`
	geo.Dim
	Items []*Item `json:"-"`
	Sub   *Item   `json:"-"`
}
