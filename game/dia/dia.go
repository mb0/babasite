// Package dia provides a dialog system.
package dia

import (
	"encoding/json"

	"github.com/mb0/babasite/game/ids"
)

type Dialog struct {
	ID      ids.Dia  `json:"id"`
	Title   string   `json:"title"`
	Text    string   `json:"text"`
	Choices []Choice `json:"choices"`
}

type Choice struct {
	Text string  `json:"text"`
	Next ids.Dia `json:"next,omitempty"`
	Trig string  `json:"trig,omitempty"`
	Cond string  `json:"cond,omitempty"`
}

func (d *Dialog) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, d) }
func (d *Dialog) MarshalBinary() ([]byte, error)   { return json.Marshal(d) }
