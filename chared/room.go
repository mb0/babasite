package chared

import (
	"fmt"
	"log"
	"sort"

	"github.com/mb0/babasite/site"
	"github.com/tidwall/buntdb"
	"xelf.org/daql/hub"
)

type AssetSubs struct {
	*Asset
	Subs []hub.Conn
}

type Room struct {
	site.ChatRoom
	Store  *BuntStore
	Assets map[uint32]*AssetSubs
	Subs   map[int64]uint32
}

func NewRoom(name string, db *buntdb.DB) *Room {
	r := &Room{
		ChatRoom: *site.NewChat(name),
		Store:    NewBuntStore(db),
		Assets:   make(map[uint32]*AssetSubs),
		Subs:     make(map[int64]uint32),
	}
	// read all assets from database
	assets, err := r.Store.LoadAll()
	if err != nil {
		log.Fatalf("chared failed to load assets: %v", err)
	}
	for _, a := range assets {
		r.Assets[a.ID] = &AssetSubs{Asset: a}
	}
	return r
}
func (r *Room) Route(m *hub.Msg) {
	res := r.handle(m)
	if res != nil {
		m.From.Chan() <- res
	}
}
func (r *Room) handle(m *hub.Msg) *hub.Msg {
	switch m.Subj {
	case "enter":
		r.ChatRoom.Route(m)
		return site.RawMsg("init", initMsg{r.AssetInfos()})
	case "chat":
		r.ChatRoom.Route(m)
	case "exit":
		r.unsub(m.From.ID())
		r.ChatRoom.Route(m)
	case "asset.open", "asset.del":
		var req Asset
		m.Unmarshal(&req)
		a, ok := r.Assets[req.ID]
		if !ok {
			return m.ReplyErr(fmt.Errorf("no asset %d", req.ID))
		}
		if m.Subj == "asset.open" {
			r.unsub(m.From.ID())
			r.sub(m.From, a)
			return m.Reply(a)
		} else {
			for _, s := range a.Subs {
				delete(r.Subs, s.ID())
			}
			return m.ReplyRes(true)
		}
	case "asset.new":
		var req Asset
		m.Unmarshal(&req)
		if req.Name == "" {
			return m.ReplyErr(fmt.Errorf("invalid name"))
		}
		if r.hasAssetName(req.Name) {
			return m.ReplyErr(fmt.Errorf("asset named %s exists", req.Name))
		}
		switch req.Kind {
		case "char":
			if req.W <= 0 {
				req.W = 48
			}
			if req.H <= 0 {
				req.H = 48
			}
		case "tile":
			if req.W <= 0 {
				req.W = 16
			}
			if req.H <= 0 {
				req.H = 16
			}
		case "item":
			if req.W <= 0 {
				req.W = 64
			}
			if req.H <= 0 {
				req.H = 64
			}
		default:
			return m.ReplyErr(fmt.Errorf("invalid kind"))
		}
		if req.Pal.Colors == nil {
			req.Pal = DefaultPallette()
		}
		// TODO validate more asset details
		err := r.Store.SaveAsset(&req)
		if err != nil {
			return m.ReplyErr(fmt.Errorf("saving asset: %v", err))
		}
		r.unsub(m.From.ID())
		a := &AssetSubs{Asset: &req}
		r.Assets[req.ID] = a
		r.sub(m.From, a)
		return m.Reply(a)
	case "seq.new", "seq.del", "pic.new", "pic.del", "pic.edit":
		a := r.getSub(m.From)
		if a == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		return r.handleSub(m, a)
	}
	return nil
}

func (r *Room) handleSub(m *hub.Msg, a *AssetSubs) *hub.Msg {
	switch m.Subj {
	case "seq.new", "seq.del":
		var req struct {
			Name string
			Pics int
		}
		m.Unmarshal(&req)
		if req.Name == "" {
			return m.ReplyErr(fmt.Errorf("sequence must have a name"))
		}
		found := -1
		for i, seq := range a.Seq {
			if seq.Name == req.Name {
				found = i
				break
			}
		}
		if m.Subj == "seq.del" {
			if found == -1 {
				return m.ReplyRes(false)
			}
			// remove seq from asset and save
			a.Seq = append(a.Seq[:found], a.Seq[found+1:]...)
			return m.ReplyRes(true)
		}
		if req.Pics < 1 {
			req.Pics = 1
		}
		pics := make([][]int16, req.Pics)
		for i := range pics {
			pics[i] = make([]int16, a.W*a.H)
		}
		a.Seq = append(a.Seq, &Sequence{Name: req.Name, Pics: pics})
	// TODO case "seq.edit":
	//	maybe rename and moving pics around in seq
	case "pic.new", "pic.del":
		var req struct {
			Seq string
			Pic int
		}
		m.Unmarshal(&req)
		s := getSeq(a.Asset, req.Seq)
		if m.Subj == "pic.del" {
			s.Pics = append(s.Pics[:req.Pic], s.Pics[req.Pic+1:]...)
		} else {
			s.Pics = append(s.Pics, make([]int16, a.W*a.H))
		}
	case "pic.edit":
		var req EditPic
		m.Unmarshal(&req)
		// apply edit
		err := Apply(a.Asset, req)
		if err != nil {
			return m.ReplyErr(err)
		}
		// share edit with subscribers
		bcast := site.RawMsg("pic.edit", req)
		for _, c := range a.Subs {
			if c.ID() != m.From.ID() {
				c.Chan() <- bcast
			}
		}
		return m.Reply(req)
	}
	return nil
}
func (g *Room) getSub(c hub.Conn) *AssetSubs {
	asset := g.Subs[c.ID()]
	if asset == 0 {
		return nil
	}
	return g.Assets[asset]
}
func (g *Room) sub(c hub.Conn, a *AssetSubs) {
	a.Subs = append(a.Subs, c)
	g.Subs[c.ID()] = a.ID
}
func (g *Room) unsub(id int64) {
	sub := g.Subs[id]
	if sub > 0 {
		if prev, ok := g.Assets[sub]; ok {
			for i, s := range prev.Subs {
				if s.ID() == id {
					prev.Subs = append(prev.Subs[:i], prev.Subs[i+1:]...)
					break
				}
			}
		}
		delete(g.Subs, id)
	}
}
func (g *Room) hasAssetName(name string) bool {
	for _, a := range g.Assets {
		if a.Name == name {
			return true
		}
	}
	return false
}

func (g *Room) AssetInfos() []assetInfo {
	res := make([]assetInfo, 0, len(g.Assets))
	for _, a := range g.Assets {
		res = append(res, assetInfo{
			ID: a.ID, Name: a.Name, Kind: a.Kind,
		})
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Name < res[j].Name
	})
	return res
}

type initMsg struct {
	Assets []assetInfo `json:"assets"`
}
type assetInfo struct {
	ID   uint32 `json:"id"`
	Name string `json:"name"`
	Kind string `json:"kind"`
}
