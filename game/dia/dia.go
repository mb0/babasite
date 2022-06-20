// Package dia provides a dialog system.
package dia

import (
	"encoding/json"

	"github.com/mb0/babasite/game/ids"
)

type Dialog struct {
	ID     ids.Dia  `json:"id"`
	Title  string   `json:"title"`
	Text   string   `json:"text"`
	Choice []Choice `json:"choice"`
}

type Choice struct {
	Text string  `json:"text"`
	Next ids.Dia `json:"next,omitempty"`
}

func (*Dialog) Make(id uint32) Dialog              { return Dialog{ID: ids.Dia(id)} }
func (d *Dialog) UID() uint32                      { return uint32(d.ID) }
func (d *Dialog) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, d) }
func (d *Dialog) MarshalBinary() ([]byte, error)   { return json.Marshal(d) }
