package maped

import (
	"fmt"
	"log"
	"path/filepath"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type MapSubs struct {
	*TileMap
	Subs []hub.Conn
}

func (ms *MapSubs) Bcast(m *hub.Msg, except int64) {
	for _, c := range ms.Subs {
		if c.ID() != except {
			hub.Send(c, m)
		}
	}
}

type Room struct {
	site.ChatRoom
	Store *FileStore
	MSubs map[string]*MapSubs
	Subs  map[int64]*MapSubs
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
		MSubs:    make(map[string]*MapSubs),
		Subs:     make(map[int64]*MapSubs),
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
		r.ChatRoom.Route(m)
		// TODO init info message with map infos and tilesets
		return site.RawMsg("init", Info{
			Infos:    r.Store.MapInfos(),
			Tilesets: r.Store.Tilesets(),
		})
	case "chat":
		r.ChatRoom.Route(m)
	case "exit":
		r.unsub(m.From.ID())
		r.ChatRoom.Route(m)
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
		tm := r.Store.TileMap(req.Name)
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
		tm = NewTileMap(req.Name, req.Dim, req.Tileset)
		err := r.Store.SaveTileMap(tm)
		if err != nil {
			return m.ReplyErr(err)
		}
		r.unsub(m.From.ID())
		ms := &MapSubs{TileMap: tm}
		r.MSubs[tm.Name] = ms
		r.sub(m.From, ms)
		r.Bcast(site.RawMsg("map.new", tm.MapInfo))
		return site.RawMsg("map.open", tm)
	case "map.open", "map.del":
		var req struct {
			Name string `json:"name"`
		}
		m.Unmarshal(&req)
		if !NameCheck.MatchString(req.Name) {
			return m.ReplyErr(fmt.Errorf("invalid map name %s", req.Name))
		}
		tm := r.Store.TileMap(req.Name)
		if tm == nil {
			return m.ReplyErr(fmt.Errorf("no map with name %s", req.Name))
		}
		ms := r.MSubs[tm.Name]
		if m.Subj == "map.open" {
			if ms == nil {
				ms = &MapSubs{TileMap: tm}
				r.MSubs[tm.Name] = ms
			}
			r.unsub(m.From.ID())
			r.sub(m.From, ms)
			return m.Reply(tm)
		} else {
			if ms != nil {
				for _, s := range ms.Subs {
					delete(r.Subs, s.ID())
				}
				delete(r.MSubs, ms.Name)
			}
			r.Store.DropTileMap(tm.Name)
			r.Bcast(site.RawMsg(m.Subj, req))
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
		r.Bcast(site.RawMsg(m.Subj, lvl))
	case "level.del":
		ms := r.Subs[m.From.ID()]
		if ms == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		var req struct {
			ID int `json:"id"`
		}
		m.Unmarshal(&req)
		lvl := ms.Levels[req.ID]
		if lvl == nil {
			return m.ReplyErr(fmt.Errorf("level id %d not found", req.ID))
		}
		// TODO think about cleaning up reference or aborting the deletion
		delete(ms.Levels, req.ID)
		r.Store.DropLevel(ms.TileMap, req.ID)
		ms.Bcast(site.RawMsg(m.Subj, req), 0)
	case "level.edit":
		ms := r.Subs[m.From.ID()]
		if ms == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		var req EditLevel
		m.Unmarshal(&req)
		// apply edit
		err := Apply(ms.TileMap, req)
		if err != nil {
			return m.ReplyErr(err)
		}
		// TODO do not save the level to disk on every edit
		p, err := r.Store.SaveLevel(ms.TileMap, req.ID)
		if err != nil {
			return m.ReplyErr(err)
		}
		req.ID = p.ID
		// share edit with all subscribers
		ms.Bcast(site.RawMsg("level.edit", req), 0)
	}
	return nil
}
func (r *Room) sub(c hub.Conn, ms *MapSubs) {
	ms.Subs = append(ms.Subs, c)
	r.Subs[c.ID()] = ms
}
func (r *Room) unsub(id int64) {
	sub, ok := r.Subs[id]
	if ok {
		delete(r.Subs, id)
		if sub != nil {
			for i, s := range sub.Subs {
				if s.ID() == id {
					sub.Subs = append(sub.Subs[:i], sub.Subs[i+1:]...)
					break
				}
			}
		}
	}
}

type Info struct {
	Tilesets []Tileset `json:"tilesets,omitempty"`
	Infos    []MapInfo `json:"infos,omitempty"`
}
