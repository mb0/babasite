package gamed

import (
	"github.com/mb0/babasite/game/lvl"
	"github.com/mb0/babasite/game/pix"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type WorldSubs struct {
	*lvl.World
	site.Conns
}

type AssetSubs struct {
	*pix.Asset
	site.Conns
}

type ConnSubs struct {
	Asset *AssetSubs
	World *WorldSubs
}

type RoomSubs struct {
	Worlds map[string]*WorldSubs
	Assets map[string]*AssetSubs
	Subs   map[int64]*ConnSubs
}

func MakeRoomSubs() RoomSubs {
	return RoomSubs{
		Worlds: make(map[string]*WorldSubs),
		Assets: make(map[string]*AssetSubs),
		Subs:   make(map[int64]*ConnSubs),
	}
}

func (r *RoomSubs) SubWorld(c hub.Conn, w *WorldSubs) {
	id := c.ID()
	sub, ok := r.Subs[id]
	if !ok {
		sub = &ConnSubs{}
		r.Subs[id] = sub
	}
	if old := sub.World; old != w {
		if old != nil {
			old.Conns = old.Unsub(id)
		}
		sub.World = w
		w.Conns = append(w.Conns, c)
	}
}

func (r *RoomSubs) SubAsset(c hub.Conn, a *AssetSubs) {
	id := c.ID()
	sub, ok := r.Subs[id]
	if !ok {
		sub = &ConnSubs{}
		r.Subs[id] = sub
	}
	if old := sub.Asset; old != a {
		if old != nil {
			old.Conns = old.Unsub(id)
		}
		sub.Asset = a
		a.Conns = append(a.Conns, c)
	}
}

func (r *RoomSubs) Unsub(id int64) {
	sub, ok := r.Subs[id]
	if ok {
		delete(r.Subs, id)
		if s := sub.Asset; s != nil {
			s.Conns = s.Conns.Unsub(id)
		}
		if s := sub.World; s != nil {
			s.Conns = s.Conns.Unsub(id)
		}
	}
}
func (r *RoomSubs) AssetSub(c hub.Conn) *AssetSubs {
	if s := r.Subs[c.ID()]; s != nil {
		return s.Asset
	}
	return nil
}
func (r *RoomSubs) WorldSub(c hub.Conn) *WorldSubs {
	if s := r.Subs[c.ID()]; s != nil {
		return s.World
	}
	return nil
}
