package path

import (
	"encoding/json"

	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/pfind"
)

// Tick represents our game time, that might be paused.
// Due to browser interop limited to 53 bit. We can cover 285616 years in millisecond precision.
type Tick uint64

// Verb is the kind of action to be done.
type Verb uint32

// Some common verbs are:
const (
	_     Verb = iota
	Go         // Go to a level position
	Look       // Look at an object from afar
	Focus      // Focus an object to inspect it closely
	Use        // Use an object
	Loot       // Loot an objects inventory
	// To drop items we have special system to create a pile object with an associated inventory
	// To combine items we have special object like a work bench that we could loot to place
	// materials and/or use to then actually do the work.
)

// Act represents a action of a game object that may relate to another object at a given tick
// for a duration and can specifically also represent a path.
type Act struct {
	ID   ids.Act `json:"id"`
	Lvl  ids.Lvl `json:"lvl"`
	Subj ids.Obj `json:"subj"`
	Verb Verb    `json:"verb,omitempty"`
	Obj  ids.Obj `json:"obj,omitempty"`

	Start Tick         `json:"start,omitempty"`
	Total Tick         `json:"total,omitempty"`
	Path  []pfind.Node `json:"path,omitempty"`
}

func (*Act) Make(id uint32) Act                 { return Act{ID: ids.Act(id)} }
func (a *Act) UID() uint32                      { return uint32(a.ID) }
func (a *Act) UnmarshalBinary(raw []byte) error { return json.Unmarshal(raw, a) }
func (a *Act) MarshalBinary() ([]byte, error)   { return json.Marshal(a) }
