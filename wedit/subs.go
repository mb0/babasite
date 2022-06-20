package wedit

import (
	"fmt"
	"time"

	"github.com/mb0/babasite/game"
	"github.com/mb0/babasite/game/ids"
	"xelf.org/daql/hub"
)

type ConnSubs struct {
	Editor *Editor
}

type RoomSubs struct {
	Worlds  []string
	Editors map[string]*Editor
	Subs    map[int64]*ConnSubs
}

func MakeRoomSubs() RoomSubs {
	return RoomSubs{
		Editors: make(map[string]*Editor),
		Subs:    make(map[int64]*ConnSubs),
	}
}

func (r *RoomSubs) SubEditor(c hub.Conn, ed *Editor) {
	id := c.ID()
	sub, ok := r.Subs[id]
	if !ok {
		sub = &ConnSubs{}
		r.Subs[id] = sub
	}
	if old := sub.Editor; old != ed {
		if old != nil {
			old.Conns = old.Unsub(id)
		}
		sub.Editor = ed
		ed.Conns = append(ed.Conns, c)
	}
}

func (r *RoomSubs) Unsub(id int64) {
	sub, ok := r.Subs[id]
	if ok {
		delete(r.Subs, id)
		if s := sub.Editor; s != nil {
			s.Conns = s.Conns.Unsub(id)
		}
	}
}

func (r *RoomSubs) EditorSub(c hub.Conn) *Editor {
	if s := r.Subs[c.ID()]; s != nil {
		return s.Editor
	}
	return nil
}

func (s *RoomSubs) WorldIdx(name string) int {
	for idx, o := range s.Worlds {
		if o == name {
			return idx
		}
	}
	return -1
}
func (s *RoomSubs) HasWorld(name string) bool {
	for _, o := range s.Worlds {
		if o == name {
			return true
		}
	}
	return false
}

func (s *RoomSubs) NewWorld(name string) (*game.World, error) {
	if !ids.NameCheck.MatchString(name) {
		return nil, fmt.Errorf("invalid name %s", name)
	}
	if s.HasWorld(name) {
		return nil, fmt.Errorf("already exists")
	}
	var w game.World
	w.Name = name
	s.Worlds = append(s.Worlds, name)
	return &w, s.SetDefaults(&w)
}
func (s *RoomSubs) SetDefaults(w *game.World) error {
	if w.Vers.Mod == 0 {
		w.Vers.Mod = time.Now().Unix()
	}
	return nil
}
