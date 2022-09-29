package ids

import (
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

var NameCheck = regexp.MustCompile(`^[a-z0-9_]+$`)

// Topic is a compound id that identifies a specific game resource mostly used for pic, clip an img.
// It uses a text encoding, for example: "pic:123", "clip:42", "img:5" or "obj:1337".
type Topic struct {
	Top string `json:"top"`
	ID  uint32 `json:"id"`
}

func (t Topic) String() string               { return fmt.Sprintf("%s:%d", t.Top, t.ID) }
func (t Topic) MarshalText() ([]byte, error) { return []byte(t.String()), nil }
func (t *Topic) UnmarshalText(raw []byte) error {
	top, sid, ok := strings.Cut(string(raw), ":")
	t.Top = top
	if !ok {
		return nil
	}
	id, err := strconv.ParseUint(sid, 10, 32)
	if err != nil {
		return err
	}
	t.ID = uint32(id)
	return nil
}

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
