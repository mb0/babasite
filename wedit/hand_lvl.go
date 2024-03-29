package wedit

import (
	"fmt"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/lvl"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

func tsetNew(ed *ConnSubs, m *hub.Msg) error {
	req := ParseName(m)
	ts, err := ed.Lvl.NewTset(req.Name)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, ts), 0)
	return nil
}
func tsetDel(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Tset](m)
	err := ed.Lvl.DelTset(req.ID)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func tsetEdit(ed *ConnSubs, m *hub.Msg) (err error) {
	var req struct {
		ID    ids.Tset       `json:"id"`
		Name  *string        `json:"name,omitempty"`
		Infos []lvl.TileInfo `json:"infos,omitempty"`
		SliceReq[lvl.TileInfo]
	}
	m.Unmarshal(&req)
	sl := ed.Lvl.Tset.Slot(req.ID)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	res := &sl.Data
	if req.Name != nil {
		// TODO check uniqueness
		res.Name = *req.Name
	}
	res.Infos, err = req.Apply(res.Infos, req.Infos)
	if err != nil {
		return err
	}
	sl.MarkMod()
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func tsetTile(ed *ConnSubs, m *hub.Msg) error {
	// edit a specific tile
	var req struct {
		ID   ids.Tset `json:"id"`
		Tile int      `json:"tile"`
		lvl.TileInfo
	}
	m.Unmarshal(&req)
	sl := ed.Lvl.Tset.Slot(req.ID)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	ts := &sl.Data
	if req.Tile < 0 {
		var max lvl.Tile
		for _, nfo := range ts.Infos {
			if nfo.Tile > max {
				max = nfo.Tile
			}
		}
		req.Tile = int(max + 1)
		req.TileInfo.Tile = max + 1
		ts.Infos = append(ts.Infos, req.TileInfo)
	} else {
		idx := -1
		req.TileInfo.Tile = lvl.Tile(req.Tile)
		for i, nfo := range ts.Infos {
			if req.TileInfo.Tile == nfo.Tile {
				idx = i
				break
			}
		}
		if idx < 0 {
			return fmt.Errorf("tile %d not found in %s", req.Tile, ts.Name)
		}
		ts.Infos[idx] = req.TileInfo
	}
	sl.MarkMod()
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}

func lvlNew(ed *ConnSubs, m *hub.Msg) error {
	var req struct {
		lvl.Lvl
		Open bool `json:"open,omitempty"`
	}
	m.Unmarshal(&req)
	lvl, err := ed.Lvl.NewLvl(req.Lvl)
	if err != nil {
		return err
	}
	if lvl.Tset == 0 {
		ts := ids.NamedFind(&ed.Lvl.Tset, "default")
		if ts == nil {
			ts, err = ed.Lvl.NewTset("default")
			if err == nil {
				ed.Bcast(site.RawMsg("tset.new", ts), 0)
			}
		}
		if ts != nil {
			lvl.Tset = ts.ID
		}
	}
	ed.Bcast(site.RawMsg(m.Subj, lvl), 0)
	if req.Open {
		return sendLvlOpen(ed, lvl)
	}
	return nil
}
func lvlDel(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Lvl](m)
	err := ed.Lvl.DelLvl(req.ID)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}

func lvlOpen(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Lvl](m)
	l, err := ed.Lvl.Lvl.Get(req.ID)
	if err != nil {
		return err
	}
	return sendLvlOpen(ed, l)
}
func sendLvlOpen(ed *ConnSubs, l *lvl.Lvl) error {
	g, err := ed.Lvl.Grid.Get(l.Grid)
	if err != nil {
		return err
	}
	// can only be subscribed to one lvl at a time
	ed.UnsubKind(l.ID.Top())
	ed.SubTop(l.ID)
	hub.Send(ed.Conn, site.RawMsg("lvl.open", g))
	return nil
}
func lvlEdit(ed *ConnSubs, m *hub.Msg) error {
	var req lvl.Lvl
	m.Unmarshal(&req)
	sl := ed.Lvl.Lvl.Slot(req.ID)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	sl.Data = req
	sl.MarkMod()
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func lvlClose(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Lvl](m)
	ed.UnsubTop(req.ID)
	return nil
}

func gridEdit(ed *ConnSubs, m *hub.Msg) error {
	var req struct {
		ID ids.Lvl `json:"id"`
		grid.Edit[lvl.Tile]
	}
	m.Unmarshal(&req)
	// apply edit
	l, err := ed.Lvl.Lvl.Get(req.ID)
	if err != nil {
		return err
	}
	sl := ed.Lvl.Grid.Slot(l.Grid)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	err = req.Apply(geo.Box{Dim: l.Dim}, &sl.Data.Tiles)
	if err != nil {
		return err
	}
	sl.MarkMod()
	// share edit with all subscribers
	ed.Tops[l.ID].BcastRaw(m.Subj, req, 0)
	return nil
}
