// Package wedit provides the server backend for a game world editor.
// We originally had separate maped and chared, which unified code in gamed.
// Now that we want to import the old editor data, we need a new package to avoid an import cycle.
// We should later moved code from gamed into the editor package.
package wedit

import (
	"github.com/mb0/babasite/game"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type EditFunc = func(*Editor, *hub.Msg) error

var editFuncs = map[string]EditFunc{
	"tset.new":  tsetNew,
	"tset.del":  tsetDel,
	"tset.edit": tsetEdit,
	"lvl.new":   lvlNew,
	"lvl.del":   lvlDel,
	"lvl.edit":  lvlEdit,
	"grid.open": gridOpen,
	"grid.edit": gridEdit,
	"img.new":   imgNew,
	"img.del":   imgDel,
	"img.open":  imgOpen,
	"img.edit":  imgDel,
	"clip.new":  clipNew,
	"clip.del":  clipDel,
	"clip.edit": clipEdit,
	"pic.edit":  picEdit,
}

// Editor provides the world data and ways to edit this data.
type Editor struct {
	*game.World
	site.Conns
}

func NewEditor(w *game.World) *Editor {
	ed := &Editor{World: w}
	return ed
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
