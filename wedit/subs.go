package wedit

import (
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type RoomSubs struct {
	Editors map[string]*Editor
	Subs    map[int64]*ConnSubs
}

type ConnSubs struct {
	Conn hub.Conn
	*Editor
	Subs []*TopicSubs
}

type Top interface {
	Top() string
}

// most model changes are sent to all connected clients
// however the level grids an img pics are only subscribed when needed
// when user opens a img or lvl we auto subscribe for grid and pics changes
type TopicSubs struct {
	Top Top
	site.Conns
}

func (ts *TopicSubs) BcastRaw(subj string, data any, except int64) {
	if ts != nil && len(ts.Conns) != 0 {
		ts.Bcast(site.RawMsg(subj, data), except)
	}
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
		sub = &ConnSubs{Conn: c}
		r.Subs[id] = sub
	}
	if old := sub.Editor; old != ed {
		sub.unsubAll()
		sub.Editor = ed
		ed.Conns = append(ed.Conns, c)
	}
}

func (r *RoomSubs) Unsub(id int64) {
	sub, ok := r.Subs[id]
	if ok {
		sub.unsubAll()
		delete(r.Subs, id)
	}
}

func (r *RoomSubs) EditorSub(c hub.Conn) *Editor {
	if s := r.Subs[c.ID()]; s != nil {
		return s.Editor
	}
	return nil
}

func (sub *ConnSubs) unsubAll() {
	id := sub.Conn.ID()
	for _, top := range sub.Subs {
		top.Conns = top.Unsub(id)
	}
	if ed := sub.Editor; ed != nil {
		ed.Conns = ed.Unsub(id)
	}
	sub.Editor, sub.Subs = nil, nil
}

func (sub *ConnSubs) SubTop(t Top) *TopicSubs {
	if sub == nil || sub.Editor == nil {
		return nil
	}
	ed := sub.Editor
	tc := ed.Tops[t]
	if tc == nil {
		tc = &TopicSubs{Top: t}
		ed.Tops[t] = tc
	}
	tc.Conns = tc.Sub(sub.Conn)
	sub.Subs = append(sub.Subs, tc)
	return tc
}
func (sub *ConnSubs) UnsubTop(t Top) *TopicSubs {
	if sub == nil || sub.Editor == nil {
		return nil
	}
	ed := sub.Editor
	tc := ed.Tops[t]
	if tc == nil {
		return nil
	}
	id := sub.Conn.ID()
	tc.Conns = tc.Unsub(id)
	tmp := sub.Subs[:0]
	for _, top := range sub.Subs {
		if top.Top != t {
			tmp = append(tmp, top)
		}
	}
	sub.Subs = tmp
	return tc
}
func (sub *ConnSubs) UnsubKind(kind string) {
	if sub == nil || sub.Editor == nil {
		return
	}
	id := sub.Conn.ID()
	tmp := sub.Subs[:0]
	for _, tc := range sub.Subs {
		if tc.Top.Top() != kind {
			tmp = append(tmp, tc)
			continue
		}
		tc.Conns = tc.Unsub(id)
	}
	sub.Subs = tmp
}
