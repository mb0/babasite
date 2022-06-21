package wedit

import (
	"fmt"
	"time"

	"github.com/mb0/babasite/game"
	"github.com/mb0/babasite/game/bolt"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/site"
	"go.etcd.io/bbolt"
	"xelf.org/daql/hub"
)

type Room struct {
	DB *bbolt.DB
	site.ChatRoom
	RoomSubs
	input chan *hub.Msg

	Worlds []string
}

func NewRoom(datapath string) (*Room, error) {
	db, err := Load(datapath)
	if err != nil {
		return nil, err
	}
	subs := MakeRoomSubs()
	chat := site.NewChat("wedit")
	r := &Room{DB: db, ChatRoom: *chat, RoomSubs: subs,
		input: make(chan *hub.Msg, 64),
	}
	err = db.View(func(tx *bbolt.Tx) error {
		r.Worlds = bolt.LoadWorldInfos(tx)
		return nil
	})
	if err != nil {
		return nil, err
	}
	// for now run all editors within one go routine to keep things simple.
	// we may later isolate each world editor to its own routine.
	go func() {
		ticker := time.NewTicker(time.Second)
		tick, _ := hub.RawMsg("_tick", nil)
		for {
			select {
			case m := <-r.input:
				res := r.handle(m)
				if res != nil {
					hub.Send(m.From, res)
				}
			case <-ticker.C:
				r.handle(tick)
			}
		}
	}()
	return r, nil
}

func (r *Room) Route(m *hub.Msg) { r.input <- m }

func (r *Room) handle(m *hub.Msg) *hub.Msg {
	switch m.Subj {
	case "enter":
		r.Enter(m)
		// init info message with world infos
		return site.RawMsg("wedit.init", InitInfo{Worlds: r.Worlds})
	case "chat":
		r.Chat(m)
	case "exit":
		r.Unsub(m.From.ID())
		r.Exit(m)
	case "world.new":
		req := ParseName(m)
		w, err := r.NewWorld(req.Name)
		if err != nil {
			return m.ReplyErr(err)
		}
		ed := NewEditor(w)
		r.Editors[w.Name] = ed
		r.SubEditor(m.From, ed)
		r.Bcast(site.RawMsg("world.new", req), 0)
		return site.RawMsg("world.open", ed.Info())
	case "world.open":
		req := ParseName(m)
		if !r.HasWorld(req.Name) {
			return m.ReplyErr(ids.ErrNotFound)
		}
		ed := r.Editors[req.Name]
		if ed == nil {
			ed = NewEditor(&game.World{})
			ed.Name = req.Name
			err := r.DB.View(func(tx *bbolt.Tx) error {
				return (*bolt.WorldSync)(ed.World).Load(tx)
			})
			if err != nil {
				return m.ReplyErr(err)
			}
			r.Editors[req.Name] = ed
		}
		r.SubEditor(m.From, ed)
		return site.RawMsg("world.open", ed.Info())
	case "world.del":
		req := ParseName(m)
		idx := r.WorldIdx(req.Name)
		if idx < 0 {
			return m.ReplyErr(ids.ErrNotFound)
		}
		// TODO delete from db directly
		w := r.Editors[req.Name]
		if w == nil {
			// TODO drop world subs
		}
		r.Worlds = append(r.Worlds[:idx], r.Worlds[idx+1:]...)
		r.Bcast(site.RawMsg("world.del", req), 0)
		return nil
	case "_tick":

	default:
		if m.From == nil {
			return nil
		}
		sub := r.Subs[m.From.ID()]
		if sub == nil || sub.Editor == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		f := editFuncs[m.Subj]
		if f == nil {
			return m.ReplyErr(fmt.Errorf("unknown subj"))
		}
		err := f(sub, m)
		if err != nil {
			return m.ReplyErr(err)
		}
	}
	return nil
}

type InitInfo struct {
	Worlds []string `json:"worlds"`
}

func (r *Room) WorldIdx(name string) int {
	for idx, o := range r.Worlds {
		if o == name {
			return idx
		}
	}
	return -1
}
func (r *Room) HasWorld(name string) bool {
	return r.WorldIdx(name) >= 0
}

func (r *Room) NewWorld(name string) (*game.World, error) {
	if !ids.NameCheck.MatchString(name) {
		return nil, fmt.Errorf("invalid name %s", name)
	}
	if r.HasWorld(name) {
		return nil, fmt.Errorf("already exists")
	}
	var w game.World
	w.Name = name
	r.Worlds = append(r.Worlds, name)
	return &w, r.SetDefaults(&w)
}
func (r *Room) SetDefaults(w *game.World) error {
	if w.Vers.Mod == 0 {
		w.Vers.Mod = time.Now().Unix()
	}
	return nil
}
