package game

import "encoding/json"

type Vers struct {
	Major uint  `json:"major"`
	Minor uint  `json:"minor"`
	Mod   int64 `json:"mod"`
}

type WorldMeta struct {
	Name string `json:"name"`
	Vers Vers   `json:"vers"`
}

type GameMeta struct {
	ID    string `json:"id"`
	World string `json:"world"`
	Vers  Vers   `json:"vers"`
}

func (m *WorldMeta) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, m) }
func (m *WorldMeta) MarshalBinary() ([]byte, error)   { return json.Marshal(m) }
func (m *GameMeta) UnmarshalBinary(raw []byte) error  { return json.Unmarshal(raw, m) }
func (m *GameMeta) MarshalBinary() ([]byte, error)    { return json.Marshal(m) }
