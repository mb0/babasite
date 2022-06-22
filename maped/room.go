package maped

/*
I thought about tileset and discussed it with the team.
We decided to have a dynamic tileset per map, where we can configure tiles in detail. We can reuse
and share one tileset for multiple maps. We want a simple interface to manage and configure tiles.
*/

import (
	"fmt"

	"github.com/mb0/babasite/game/gamed"
	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/lvl"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type Room struct {
	site.ChatRoom
	Store *FileStore
	gamed.RoomSubs
}

func NewRoom(name, datapath string) *Room {
	return &Room{}
}
func (r *Room) Route(m *hub.Msg) {
}
func (r *Room) handle(m *hub.Msg) *hub.Msg {
	switch m.Subj {
	case "map.new":
		var req struct {
			Name string
			geo.Dim
			Tileset string
		}
		m.Unmarshal(&req)
		if !gamed.NameCheck.MatchString(req.Name) {
			return m.ReplyErr(fmt.Errorf("invalid map name %s", req.Name))
		}
		tm := r.Store.World(req.Name)
		if tm != nil {
			return m.ReplyErr(fmt.Errorf("map name %s already exists", req.Name))
		}
		if req.Tileset == "" {
			req.Tileset = "default"
		}
		if req.W == 0 {
			req.W = 80
		}
		if req.H == 0 {
			req.H = 60
		}
		ts := r.Store.Tileset(req.Tileset)
		if ts == nil {
			ts = &lvl.Tset{Name: req.Tileset, Infos: []lvl.TileInfo{
				{Tile: 0, Name: "void", Color: 0xffffff, Block: true, Group: "basic"},
			}}
		}
		tm = lvl.NewWorld(req.Name, req.Dim, ts)
		err := r.Store.SaveWorld(tm)
		if err != nil {
			return m.ReplyErr(err)
		}
		ms := &gamed.WorldSubs{World: tm}
		r.Worlds[tm.Name] = ms
		r.SubWorld(m.From, ms)
		r.Bcast(site.RawMsg("map.new", tm.WorldInfo), 0)
		return site.RawMsg("map.open", tm)
	case "map.open", "map.del":
		var req struct {
			Name string `json:"name"`
		}
		m.Unmarshal(&req)
		if !gamed.NameCheck.MatchString(req.Name) {
			return m.ReplyErr(fmt.Errorf("invalid map name %s", req.Name))
		}
		tm := r.Store.World(req.Name)
		if tm == nil {
			return m.ReplyErr(fmt.Errorf("no map with name %s", req.Name))
		}
		ms := r.Worlds[tm.Name]
		if m.Subj == "map.open" {
			if ms == nil {
				ms = &gamed.WorldSubs{World: tm}
				r.Worlds[tm.Name] = ms
			}
			r.SubWorld(m.From, ms)
			return m.Reply(tm)
		} else {
			if ms != nil {
				for _, s := range ms.Conns {
					delete(r.Subs, s.ID())
				}
				delete(r.Worlds, ms.Name)
			}
			r.Store.DropWorld(tm.Name)
			r.Bcast(site.RawMsg(m.Subj, req), 0)
		}
	case "level.new":
		ms := r.WorldSub(m.From)
		if ms == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		var req struct {
			Name string `json:"name"`
		}
		m.Unmarshal(&req)
		lvl := ms.NewLevel()
		lvl.Name = req.Name
		// TODO save level meta with name and later more details
		_, err := r.Store.SaveLevel(ms.World, lvl.ID)
		if err != nil {
			return m.ReplyErr(err)
		}
		r.Bcast(site.RawMsg(m.Subj, lvl), 0)
	case "level.del":
		ms := r.WorldSub(m.From)
		if ms == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		var req struct {
			ID ids.Lvl `json:"id"`
		}
		m.Unmarshal(&req)
		lvl := ms.Levels[req.ID]
		if lvl == nil {
			return m.ReplyErr(fmt.Errorf("level id %d not found", req.ID))
		}
		// TODO think about cleaning up reference or aborting the deletion
		delete(ms.Levels, req.ID)
		r.Store.DropLevel(ms.World, req.ID)
		ms.Bcast(site.RawMsg(m.Subj, req), 0)
	case "level.rename":
		ms := r.WorldSub(m.From)
		if ms == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		var req struct {
			ID   ids.Lvl `json:"id"`
			Name string  `json:"name"`
		}
		m.Unmarshal(&req)
		lvl := ms.Levels[req.ID]
		if lvl == nil {
			return m.ReplyErr(fmt.Errorf("level id %d not found", req.ID))
		}
		lvl.Name = req.Name
		_, err := r.Store.SaveLevel(ms.World, req.ID)
		if err != nil {
			return m.ReplyErr(err)
		}
		ms.Bcast(site.RawMsg(m.Subj, req), 0)
	case "level.edit":
		ms := r.WorldSub(m.From)
		if ms == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		var req gamed.EditLevel
		m.Unmarshal(&req)
		// apply edit
		err := req.Apply(ms.World)
		if err != nil {
			return m.ReplyErr(err)
		}
		// TODO do not save the level to disk on every edit
		p, err := r.Store.SaveLevel(ms.World, req.ID)
		if err != nil {
			return m.ReplyErr(err)
		}
		req.ID = p.ID
		// share edit with all subscribers
		ms.Bcast(site.RawMsg("level.edit", req), 0)
	}
	return nil
}

type Info struct {
	Tilesets []string        `json:"tilesets,omitempty"`
	Infos    []lvl.WorldInfo `json:"infos,omitempty"`
}
