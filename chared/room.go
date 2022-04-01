package chared

import (
	"fmt"
	"log"
	"path/filepath"

	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type AssetSubs struct {
	*Asset
	Subs []hub.Conn
}
type Sub struct {
	Asset *AssetSubs
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
	Store *FileStore
	ASubs map[string]*AssetSubs
	Subs  map[int64]Sub
}

func NewRoom(name string, datapath string) *Room {
	store := NewFileStore(filepath.Join(datapath, "chared"))
	// load all assets into store
	err := store.LoadAll()
	if err != nil {
		log.Fatalf("chared failed to load store: %v", err)
	}
	return &Room{
		ChatRoom: *site.NewChat(name),
		Store:    store,
		ASubs:    make(map[string]*AssetSubs),
		Subs:     make(map[int64]Sub),
	}
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
		return site.RawMsg("init", Info{
			Assets: r.Store.AssetInfos(),
			Pals:   r.Store.PalInfos(),
		})
	case "chat":
		r.ChatRoom.Route(m)
	case "exit":
		r.unsub(m.From.ID())
		r.ChatRoom.Route(m)
	case "pal.new":
		name, err := nameMsg(m)
		if err != nil {
			return m.ReplyErr(err)
		}
		p := r.Store.Pal(name)
		if p != nil {
			return m.ReplyErr(fmt.Errorf("pal %s already exists", name))
		}
		var req struct {
			Copy string
		}
		m.Unmarshal(req)
		p = &Pallette{Name: name}
		if req.Copy != "" {
			ref := r.Store.Pal(req.Copy)
			p.Feat = append(p.Feat, ref.Feat...)
		}
		err = r.Store.SavePal(p)
		if err != nil {
			return m.ReplyErr(err)
		}
		r.Bcast(site.RawMsg("pal.new", nameData{Name: name}))
		return site.RawMsg("pal.open", p)
	case "pal.open":
		name, err := nameMsg(m)
		if err != nil {
			return m.ReplyErr(err)
		}
		p := r.Store.Pal(name)
		if p == nil {
			return m.ReplyErr(fmt.Errorf("no pal %s", name))
		}
		return m.Reply(p)
	case "pal.del":
		name, err := nameMsg(m)
		if err != nil {
			return m.ReplyErr(err)
		}
		err = r.Store.DropPal(name)
		if err != nil {
			return m.ReplyErr(err)
		}
		r.Bcast(site.RawMsg(m.Subj, nameData{Name: name}))
		return nil
	case "pal.edit":
		var req struct {
			Name string  `json:"name"`
			Feat string  `json:"feat"`
			Idx  int     `json:"idx"`
			Del  int     `json:"del"`
			Ins  []Color `json:"ins"`
		}
		m.Unmarshal(&req)
		p := r.Store.Pal(req.Name)
		if p == nil {
			return m.ReplyErr(fmt.Errorf("no pal %s", req.Name))
		}
		f := p.GetFeature(req.Feat)
		if f != nil {
			tmp := make([]Color, len(f.Colors)-req.Del+len(req.Ins))
			tmp = append(tmp, f.Colors[:req.Idx]...)
			tmp = append(tmp, req.Ins...)
			tmp = append(tmp, f.Colors[req.Idx+req.Del:]...)
			f.Colors = tmp
		} else if req.Idx == 0 && req.Del == 0 {
			f = &Feature{Name: req.Feat, Colors: req.Ins}
			p.Feat = append(p.Feat, f)
		} else {
			return m.ReplyErr(fmt.Errorf("feature not found %s %s", req.Name, req.Feat))
		}
		err := r.Store.SavePal(p)
		if err != nil {
			return m.ReplyErr(err)
		}
		r.Bcast(site.RawMsg("pal.edit", req))
	case "asset.open", "asset.del":
		name, err := nameMsg(m)
		if err != nil {
			return m.ReplyErr(err)
		}
		a := r.Store.Asset(name)
		if a == nil {
			return m.ReplyErr(fmt.Errorf("no asset %s", name))
		}
		as := r.ASubs[name]
		if m.Subj == "asset.open" {
			if as == nil {
				as = &AssetSubs{Asset: a}
				r.ASubs[name] = as
			}
			r.unsub(m.From.ID())
			r.sub(m.From, as)
			return m.Reply(a)
		} else {
			if as != nil {
				for _, s := range as.Subs {
					delete(r.Subs, s.ID())
				}
				delete(r.ASubs, a.Name)
			}
			r.Store.DropAsset(a.Name)
			r.Bcast(site.RawMsg(m.Subj, nameData{Name: name}))
			return nil
		}
	case "asset.new":
		var req struct {
			AssetMeta
			Copy string
		}
		m.Unmarshal(&req)
		if !NameCheck.MatchString(req.Name) {
			return m.ReplyErr(fmt.Errorf("invalid name %s", m.Raw))
		}
		if a := r.Store.Asset(req.Name); a != nil {
			return m.ReplyErr(fmt.Errorf("asset named %s exists", req.Name))
		}
		req.Size = DefaultSize(req.Kind)
		if req.Pal == "" {
			req.Pal = "default"
		}
		req.Seq = []*SeqMeta{}
		pal := r.Store.Pal(req.Pal)
		if pal == nil && req.Pal == "default" {
			pal = DefaultPallette()
			r.Store.SavePal(pal)
		}
		a := &Asset{AssetMeta: req.AssetMeta, Pics: make(map[int]*Pic), Pal: pal}
		err := r.Store.SaveAssetMeta(a)
		if err != nil {
			return m.ReplyErr(fmt.Errorf("saving asset: %v", err))
		}
		r.unsub(m.From.ID())
		as := &AssetSubs{Asset: a}
		r.ASubs[a.Name] = as
		r.sub(m.From, as)
		r.Bcast(site.RawMsg("asset.new", AssetInfo{Name: a.Name, Kind: a.Kind}))
		return site.RawMsg("asset.open", a)
	case "seq.new", "seq.del", "seq.edit", "pic.new", "pic.del", "pic.edit":
		a := r.getSub(m.From)
		if a == nil {
			return m.ReplyErr(fmt.Errorf("not subscribed"))
		}
		return r.handleSub(m, a)
	default:
		log.Printf("unhandled subj %s", m.Subj)
	}
	return nil
}

type SeqData struct {
	*SeqMeta
	Pics []*Pic `json:"pics,omitempty"`
}

func (r *Room) handleSub(m *hub.Msg, a *AssetSubs) *hub.Msg {
	switch m.Subj {
	case "seq.new", "seq.del":
		name, err := nameMsg(m)
		if err != nil {
			return m.ReplyErr(err)
		}
		s := a.GetSeq(name)
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
			// TODO find all orphans
			err = r.Store.SaveAssetMeta(a.Asset)
			if err != nil {
				return m.ReplyErr(err)
			}
			a.Bcast(site.RawMsg("seq.del", nameData{Name: name}), 0)
			return nil
		}
		if s == nil {
			p := a.NewPic()
			s = a.AddSeq(name)
			s.IDs = []int{p.ID}
			err = r.Store.SaveAssetMeta(a.Asset)
			if err != nil {
				return m.ReplyErr(err)
			}
			a.Bcast(site.RawMsg("seq.new", SeqData{s, []*Pic{p}}), 0)
		}
		return site.RawMsg("seq.open", SeqData{s, a.GetPics(s.IDs...)})
	case "seq.edit":
		var req struct {
			Name string `json:"name"`
			Idx  int    `json:"idx"`
			Del  int    `json:"del"`
			Ins  []int  `json:"ins"`
			Pics []*Pic `json:"pics"`
		}
		err := m.Unmarshal(&req)
		s := a.GetSeq(req.Name)
		if s == nil {
			return m.ReplyErr(fmt.Errorf("sequence not found"))
		}
		for i, id := range req.Ins {
			p := a.Pics[id]
			if p == nil {
				p, err = r.Store.SavePic(a.Asset, id)
				if err != nil {
					return m.ReplyErr(fmt.Errorf("failed to save pic: %v", err))
				}
				req.Ins[i] = p.ID
				req.Pics = append(req.Pics, p)
			}
		}
		tmp := make([]int, 0, len(s.IDs)-req.Del+len(req.Ins))
		tmp = append(tmp, s.IDs[:req.Idx]...)
		tmp = append(tmp, req.Ins...)
		tmp = append(tmp, s.IDs[req.Idx+req.Del:]...)
		s.IDs = tmp
		err = r.Store.SaveAssetMeta(a.Asset)
		if err != nil {
			return m.ReplyErr(err)
		}
		a.Bcast(site.RawMsg("seq.edit", req), 0)
	case "pic.edit":
		var req EditPic
		m.Unmarshal(&req)
		// apply edit
		err := Apply(a.Asset, req)
		if err != nil {
			return m.ReplyErr(err)
		}
		p, err := r.Store.SavePic(a.Asset, req.Pic)
		if err != nil {
			return m.ReplyErr(err)
		}
		req.Pic = p.ID
		// share edit with all subscribers
		a.Bcast(site.RawMsg("pic.edit", req), 0)
	}
	return nil
}
func (g *Room) getSub(c hub.Conn) *AssetSubs {
	return g.Subs[c.ID()].Asset
}
func (g *Room) sub(c hub.Conn, a *AssetSubs) {
	a.Subs = append(a.Subs, c)
	g.Subs[c.ID()] = Sub{Asset: a}
}
func (g *Room) unsub(id int64) {
	sub, ok := g.Subs[id]
	if ok {
		delete(g.Subs, id)
		if sub.Asset != nil {
			asubs := sub.Asset.Subs
			for i, s := range asubs {
				if s.ID() == id {
					asubs = append(asubs[:i], asubs[i+1:]...)
					break
				}
			}
		}
	}
}

type nameData struct {
	Name string `json:"name"`
}

func nameMsg(m *hub.Msg) (string, error) {
	var n nameData
	m.Unmarshal(&n)
	if !NameCheck.MatchString(n.Name) {
		return "", fmt.Errorf("invalid name %s", m.Raw)
	}
	return n.Name, nil
}

type Info struct {
	Assets []AssetInfo `json:"assets,omitempty"`
	Pals   []string    `json:"pals,omitempty"`
}
