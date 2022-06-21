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
		ed := &Editor{World: w}
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
	default:
		ed := r.EditorSub(m.From)
		if ed == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		f := editFuncs[m.Subj]
		if f == nil {
			return m.ReplyErr(fmt.Errorf("unknown subj"))
		}
		err := f(ed, m)
		if err != nil {
			return m.ReplyErr(err)
		}
	}
	return nil
}

type InitInfo struct {
	Worlds []string `json:"worlds"`
}
