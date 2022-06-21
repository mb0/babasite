package wedit

import (
	"fmt"

	"github.com/mb0/babasite/game/gamed"
	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/lvl"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

func tsetNew(ed *ConnSubs, m *hub.Msg) error {
	req := ParseName(m)
	ts, err := ed.Lvl.NewTileset(req.Name)
	if err != nil {
		return err
	}
	ts.Infos = append(ts.Infos, gamed.DefaultTileset.Infos...)
	ed.Bcast(site.RawMsg(m.Subj, ts), 0)
	return nil
}
func tsetDel(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Tset](m)
	// TODO think about cleaning up reference or aborting the deletion
	err := ed.Lvl.Tset.Set(req.ID, nil)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func tsetEdit(ed *ConnSubs, m *hub.Msg) error {
	// edit a specific tile
	var req struct {
		ID   ids.Tset `json:"id"`
		Tile int      `json:"tile"`
		lvl.TileInfo
	}
	m.Unmarshal(&req)
	ts, err := ed.Lvl.Tset.Get(req.ID)
	if err != nil {
		return err
	}
	if req.Tile < 0 {
		var max lvl.Tile
		for _, nfo := range ts.Infos {
			if nfo.Tile > max {
				max = nfo.Tile
			}
		}
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
		} else {
			ts.Infos[idx] = req.TileInfo
		}
	}
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func lvlNew(ed *ConnSubs, m *hub.Msg) error {
	req := ParseName(m)
	lvl, err := ed.Lvl.Lvl.New()
	if err != nil {
		return err
	}
	lvl.Name = req.Name
	ed.Bcast(site.RawMsg(m.Subj, lvl), 0)
	return nil
}
func lvlDel(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Lvl](m)
	// TODO think about cleaning up reference or aborting the deletion
	err := ed.Lvl.Lvl.Set(req.ID, nil)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
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
	sl.Sync = ids.SyncMod
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}

func lvlOpen(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Lvl](m)
	l, err := ed.Lvl.Lvl.Get(req.ID)
	if err != nil {
		return err
	}
	g, err := ed.Lvl.Grid.Get(l.Grid)
	if err != nil {
		return err
	}
	// can only be subscribed to one lvl at a time
	ed.UnsubKind(l.ID.Top())
	ed.SubTop(l.ID)
	hub.Send(m.From, site.RawMsg(m.Subj, g))
	return nil
}
func lvlClose(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Lvl](m)
	ed.UnsubTop(req.ID)
	return nil
}

func gridEdit(ed *ConnSubs, m *hub.Msg) error {
	var req gamed.EditLevel
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
	g := sl.Data
	err = req.EditGrid.Apply(geo.Box{Dim: l.Dim}, &g.Tiles)
	if err != nil {
		return err
	}
	sl.Sync = ids.SyncMod
	// share edit with all subscribers
	ed.Tops[l.ID].BcastRaw(m.Subj, req, 0)
	return nil
}
