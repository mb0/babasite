package path

import (
	"github.com/mb0/babasite/game/ids"
)

type ActTable = ids.HashTable[ids.Act, Act, *Act]

// Sys is the action, trigger and path system of a world.
type Sys struct {
	Act ActTable
}
