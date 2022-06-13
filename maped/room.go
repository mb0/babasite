package maped

/*
I thought about tileset and discussed it with the team.
We decided to have a dynamic tileset per map, where we can configure tiles in detail. We can reuse
and share one tileset for multiple maps. We want a simple interface to manage and configure tiles.
*/

import (
	"fmt"
	"log"
	"path/filepath"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/lvl"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type WorldSubs struct {
	*lvl.World
	site.Conns
}

type Room struct {
	site.ChatRoom
	Store *FileStore
	WSubs map[string]*WorldSubs
	Subs  map[int64]*WorldSubs
}

func NewRoom(name, datapath string) *Room {
	store := NewFileStore(filepath.Join(datapath, "maped"))
	// load all assets into store
	err := store.LoadAll()
	if err != nil {
		log.Fatalf("maped failed to load store: %v", err)
	}
	return &Room{
		ChatRoom: *site.NewChat(name),
		Store:    store,
		WSubs:    make(map[string]*WorldSubs),
		Subs:     make(map[int64]*WorldSubs),
	}
}
func (r *Room) Route(m *hub.Msg) {
	res := r.handle(m)
	if res != nil {
		hub.Send(m.From, res)
	}
}
func (r *Room) handle(m *hub.Msg) *hub.Msg {
	switch m.Subj {
	case "enter":
		r.Enter(m)
		// init info message with map infos and tilesets
		return site.RawMsg("init", Info{
			Infos:    r.Store.WorldInfos(),
			Tilesets: r.Store.Tilesets(),
		})
	case "chat":
		r.Chat(m)
	case "exit":
		r.unsub(m.From.ID())
		r.Exit(m)
	case "tileset.new":
		var req struct {
			Name string
			Copy string
		}
		m.Unmarshal(&req)
		if !NameCheck.MatchString(req.Name) {
			return m.ReplyErr(fmt.Errorf("invalid tileset name %s", req.Name))
		}
		ts := r.Store.Tileset(req.Name)
		if ts != nil {
			return m.ReplyErr(fmt.Errorf("tileset %s already exists", req.Name))
		}
		// TODO use copy if set to copy an existing tileset
		tmp := DefaultTileset
		tmp.Name = req.Name
		r.Store.SaveTileset(&tmp)
		r.Bcast(site.RawMsg(m.Subj, req), 0)
		return site.RawMsg("tileset.open", tmp)
	case "tile.edit":
		// edit a specific tile
		var req struct {
			Tileset string `json:"tileset"`
			Tile    int    `json:"tile"`
			lvl.TileInfo
		}
		m.Unmarshal(&req)
		if !NameCheck.MatchString(req.Tileset) {
			return m.ReplyErr(fmt.Errorf("invalid tileset name %s", req.Tileset))
		}
		ts := r.Store.Tileset(req.Tileset)
		if ts == nil {
			return m.ReplyErr(fmt.Errorf("tileset %s does not exist", req.Tileset))
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
				return m.ReplyErr(fmt.Errorf("tile %d not found in %s", req.Tile, req.Tileset))
			} else {
				ts.Infos[idx] = req.TileInfo
			}
		}
		r.Store.SaveTileset(ts)
		r.Bcast(site.RawMsg(m.Subj, req), 0)
	case "map.new":
		var req struct {
			Name string
			geo.Dim
			Tileset string
		}
		m.Unmarshal(&req)
		if !NameCheck.MatchString(req.Name) {
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
			ts = &lvl.Tileset{Name: req.Tileset, Infos: []lvl.TileInfo{
				{Tile: 0, Name: "void", Color: 0xffffff, Block: true, Group: "basic"},
			}}
		}
		tm = lvl.NewWorld(req.Name, req.Dim, ts)
		err := r.Store.SaveWorld(tm)
		if err != nil {
			return m.ReplyErr(err)
		}
		r.unsub(m.From.ID())
		ms := &WorldSubs{World: tm}
		r.WSubs[tm.Name] = ms
		r.sub(m.From, ms)
		r.Bcast(site.RawMsg("map.new", tm.WorldInfo), 0)
		return site.RawMsg("map.open", tm)
	case "map.open", "map.del":
		var req struct {
			Name string `json:"name"`
		}
		m.Unmarshal(&req)
		if !NameCheck.MatchString(req.Name) {
			return m.ReplyErr(fmt.Errorf("invalid map name %s", req.Name))
		}
		tm := r.Store.World(req.Name)
		if tm == nil {
			return m.ReplyErr(fmt.Errorf("no map with name %s", req.Name))
		}
		ms := r.WSubs[tm.Name]
		if m.Subj == "map.open" {
			if ms == nil {
				ms = &WorldSubs{World: tm}
				r.WSubs[tm.Name] = ms
			}
			r.unsub(m.From.ID())
			r.sub(m.From, ms)
			return m.Reply(tm)
		} else {
			if ms != nil {
				for _, s := range ms.Conns {
					delete(r.Subs, s.ID())
				}
				delete(r.WSubs, ms.Name)
			}
			r.Store.DropWorld(tm.Name)
			r.Bcast(site.RawMsg(m.Subj, req), 0)
		}
	case "level.new":
		ms := r.Subs[m.From.ID()]
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
		ms := r.Subs[m.From.ID()]
		if ms == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		var req struct {
			ID lvl.LevelID `json:"id"`
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
		ms := r.Subs[m.From.ID()]
		if ms == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		var req struct {
			ID   lvl.LevelID `json:"id"`
			Name string      `json:"name"`
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
		ms := r.Subs[m.From.ID()]
		if ms == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		var req EditLevel
		m.Unmarshal(&req)
		// apply edit
		err := Apply(ms.World, req)
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
func (r *Room) sub(c hub.Conn, ms *WorldSubs) {
	ms.Conns = append(ms.Conns, c)
	r.Subs[c.ID()] = ms
}
func (r *Room) unsub(id int64) {
	sub, ok := r.Subs[id]
	if ok {
		delete(r.Subs, id)
		if sub != nil {
			for i, s := range sub.Conns {
				if s.ID() == id {
					sub.Conns = append(sub.Conns[:i], sub.Conns[i+1:]...)
					break
				}
			}
		}
	}
}

type Info struct {
	Tilesets []string        `json:"tilesets,omitempty"`
	Infos    []lvl.WorldInfo `json:"infos,omitempty"`
}
