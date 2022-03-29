package chared

import (
	"fmt"
	"log"
	"path/filepath"
	"sort"

	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type AssetSubs struct {
	*Asset
	Subs []hub.Conn
}

func (a *AssetSubs) Bcast(m *hub.Msg, except int64) {
	for _, c := range a.Subs {
		if c.ID() != except {
			c.Chan() <- m
		}
	}
}

type Room struct {
	site.ChatRoom
	Store  *FileStore
	Assets map[uint32]*AssetSubs
	Subs   map[int64]uint32
}

func NewRoom(name string, datapath string) *Room {
	r := &Room{
		ChatRoom: *site.NewChat(name),
		Store:    NewFileStore(filepath.Join(datapath, "chared")),
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
		if req.Pal.Feat == nil {
			req.Pal = DefaultPallette()
		}
		if len(req.Seq) == 0 {
			req.AddSeq("seq0")
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
			Seq string
		}
		m.Unmarshal(&req)
		if req.Seq == "" {
			return m.ReplyErr(fmt.Errorf("sequence must have a name"))
		}
		s := a.GetSeq(req.Seq)
		if m.Subj == "seq.del" {
			if s == nil {
				return m.ReplyErr(fmt.Errorf("sequence not found"))
			}
			// remove seq from asset and save
			for i, o := range a.Seq {
				if o == s {
					a.Seq = append(a.Seq[:i], a.Seq[i+1:]...)
					break
				}
			}
			a.Bcast(site.RawMsg("seq.del", req), 0)
			return nil
		}
		if s == nil {
			s = a.AddSeq(req.Seq)
			a.Bcast(site.RawMsg("seq.new", s), 0)
			return nil
		}
		return m.Reply(site.RawMsg("seq.new", s))
	// TODO case "seq.edit":
	//	maybe rename and moving pics around in seq
	case "pic.new", "pic.del":
		var req struct {
			Seq string
			Pic int
		}
		m.Unmarshal(&req)
		s := a.GetSeq(req.Seq)
		pic := s.GetPic(req.Pic)
		if m.Subj == "pic.del" {
			if pic != nil {
				s.Pics = append(s.Pics[:req.Pic], s.Pics[req.Pic+1:]...)
				a.Bcast(site.RawMsg("pic.del", req), 0)
			}
		} else {
			if pic == nil {
				s.Pics = append(s.Pics, a.newPic())
				req.Pic = len(s.Pics) - 1
				a.Bcast(site.RawMsg("pic.new", req), 0)
			}
		}
	case "pic.edit":
		var req EditPic
		m.Unmarshal(&req)
		// apply edit
		err := Apply(a.Asset, req)
		if err != nil {
			return m.ReplyErr(err)
		}
		err = r.Store.SaveAsset(a.Asset)
		if err != nil {
			return m.ReplyErr(err)
		}
		// share edit with all subscribers
		a.Bcast(site.RawMsg("pic.edit", req), 0)
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
