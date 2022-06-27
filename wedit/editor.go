// Package wedit provides the server backend for a game world editor.
// We originally had separate maped and chared, which unified code in gamed.
// Now that we want to import the old editor data, we need a new package to avoid an import cycle.
// We should later moved code from gamed into the editor package.
package wedit

import (
	"fmt"

	"github.com/mb0/babasite/game"
	"github.com/mb0/babasite/game/bolt"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type EditFunc = func(*ConnSubs, *hub.Msg) error

// Editor provides the world data and ways to edit this data.
// It also holds client subscriptions for certain topics.
type Editor struct {
	// The world data that is saved to disk.
	bolt.WorldSync
	// Conns holds a list of clients connected to this editor.
	site.Conns

	// Tops stores all topics and the clients that are subscribed to them.
	Tops map[Top]*TopicSubs
}

func NewEditor(w *game.World) *Editor {
	ed := &Editor{WorldSync: bolt.MakeWorldSync(w), Tops: make(map[Top]*TopicSubs)}
	return ed
}

var editFuncs = map[string]EditFunc{
	"tset.new":  tsetNew,
	"tset.del":  tsetDel,
	"tset.edit": tsetEdit,
	"tset.tile": tsetTile,
	"lvl.new":   lvlNew,
	"lvl.del":   lvlDel,
	"lvl.open":  lvlOpen,
	"lvl.edit":  lvlEdit,
	"lvl.close": lvlClose,
	"grid.edit": gridEdit,
	"pal.new":   palNew,
	"pal.del":   palDel,
	"pal.edit":  palEdit,
	"pal.feat":  palFeat,
	"img.new":   imgNew,
	"img.del":   imgDel,
	"img.open":  imgOpen,
	"img.close": imgClose,
	"img.edit":  imgEdit,
	"clip.new":  clipNew,
	"clip.del":  clipDel,
	"clip.edit": clipEdit,
	"pic.edit":  picEdit,
}

type NameReq struct {
	Name string `json:"name"`
}

func ParseName(m *hub.Msg) (req NameReq) {
	m.Unmarshal(&req)
	return req
}

type IDReq[I ids.ID] struct {
	ID I `json:"id"`
}

func ParseID[I ids.ID](m *hub.Msg) (req IDReq[I]) {
	m.Unmarshal(&req)
	return req
}

type SliceReq[T any] struct {
	Idx  int  `json:"idx,omitempty"`
	Del  int  `json:"del,omitempty"`
	Copy bool `json:"copy,omitempty"`
}

func (r SliceReq[T]) Apply(old, new []T) ([]T, error) {
	if len(new) == 0 && r.Del == 0 {
		return old, nil
	}
	if r.Idx < 0 || r.Idx > len(old) || r.Del < 0 || r.Idx+r.Del > len(old) {
		return old, fmt.Errorf("invalid slice")
	}
	tmp := make([]T, 0, len(old)-r.Del+len(new))
	tmp = append(tmp, old[:r.Idx]...)
	tmp = append(tmp, new...)
	tmp = append(tmp, old[r.Idx+r.Del:]...)
	return tmp, nil
}
