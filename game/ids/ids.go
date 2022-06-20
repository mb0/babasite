package ids

import (
	"regexp"
	"sort"
)

var NameCheck = regexp.MustCompile(`^[a-z0-9_]+$`)

// Asset is a text that identifies an asset and optionally a sequence.
// For example: "items/keycard" or "player_martin".
type Asset string

type ID interface {
	~uint32
	Top() string
}

// IDs are consecutive positive numbers valid within a world sub system.
// The zero value does represent a null instance.
type (
	Pal  uint32
	Img  uint32
	Clip uint32
	Pic  uint32

	Tset uint32
	Lvl  uint32
	Grid uint32

	Obj uint32

	Dia uint32

	Prod uint32
	Item uint32
	Inv  uint32
)

func (Pal) Top() string  { return "pal" }
func (Img) Top() string  { return "img" }
func (Clip) Top() string { return "clip" }
func (Pic) Top() string  { return "pic" }
func (Tset) Top() string { return "tset" }
func (Lvl) Top() string  { return "lvl" }
func (Grid) Top() string { return "map" }
func (Obj) Top() string  { return "obj" }
func (Dia) Top() string  { return "dia" }
func (Prod) Top() string { return "prod" }
func (Item) Top() string { return "item" }
func (Inv) Top() string  { return "inv" }

type Topic struct {
	Top string `json:"top"`
	ID  uint32 `json:"id"`
}

type List[I ID] []I

func (l List[I]) Len() int           { return len(l) }
func (l List[I]) Swap(i, j int)      { l[i], l[j] = l[j], l[i] }
func (l List[I]) Less(i, j int) bool { return l[i] < l[j] }
func (l List[I]) Unique() []I {
	if len(l) < 2 {
		return l
	}
	sort.Sort(l)
	res := l[:1]
	lst := l[0]
	for _, nxt := range l[1:] {
		if lst != nxt {
			lst = nxt
			res = append(res, nxt)
		}
	}
	return res
}
