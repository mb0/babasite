package chared

import (
	"fmt"
	"log"
	"path/filepath"
	"regexp"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/pix"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type AssetSubs struct {
	*pix.Asset
	site.Conns
}
type Sub struct {
	Asset *AssetSubs
}

type Room struct {
	site.ChatRoom
	Store *FileStore
	ASubs map[string]*AssetSubs
	Subs  map[int64]Sub
}

func NewRoom(name, datapath string) *Room {
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
		hub.Send(m.From, res)
	}
}
func (r *Room) handle(m *hub.Msg) *hub.Msg {
	switch m.Subj {
	case "enter":
		r.Enter(m)
		return site.RawMsg("init", Info{
			Assets: r.Store.AssetInfos(),
			Pals:   r.Store.PalInfos(),
		})
	case "chat":
		r.Chat(m)
	case "exit":
		r.unsub(m.From.ID())
		r.Exit(m)
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
			Copy string `json:"copy"`
		}
		m.Unmarshal(&req)
		p = &pix.Palette{Name: name}
		if req.Copy != "" {
			ref := r.Store.Pal(req.Copy)
			p.Feat = make([]*pix.Feature, len(ref.Feat))
			for i, f := range ref.Feat {
				colors := append([]pix.Color(nil), f.Colors...)
				p.Feat[i] = &pix.Feature{Name: f.Name, Colors: colors}
			}
		}
		err = r.Store.SavePal(p)
		if err != nil {
			return m.ReplyErr(err)
		}
		r.Bcast(site.RawMsg("pal.new", p), 0)
		if a := r.getSub(m.From); a != nil {
			a.AssetInfo.Pal = p.Name
			r.Store.SaveAssetInfo(a.Asset)
			a.Bcast(site.RawMsg("pal.open", nameData{p.Name}), 0)
			return nil
		}
		return site.RawMsg("pal.open", nameData{p.Name})
	case "pal.open":
		name, err := nameMsg(m)
		if err != nil {
			return m.ReplyErr(err)
		}
		p := r.Store.Pal(name)
		if p == nil {
			return m.ReplyErr(fmt.Errorf("no pal %s", name))
		}
		if a := r.getSub(m.From); a != nil {
			a.AssetInfo.Pal = p.Name
			r.Store.SaveAssetInfo(a.Asset)
			a.Bcast(site.RawMsg("pal.open", nameData{p.Name}), 0)
			return nil
		}
		return m.Reply(nameData{name})
	case "pal.del":
		name, err := nameMsg(m)
		if err != nil {
			return m.ReplyErr(err)
		}
		err = r.Store.DropPal(name)
		if err != nil {
			return m.ReplyErr(err)
		}
		r.Bcast(site.RawMsg(m.Subj, nameData{Name: name}), 0)
		return nil
	case "pal.edit":
		var req struct {
			Name string      `json:"name"`
			Feat string      `json:"feat"`
			Idx  int         `json:"idx"`
			Del  int         `json:"del"`
			Ins  []pix.Color `json:"ins"`
		}
		m.Unmarshal(&req)
		p := r.Store.Pal(req.Name)
		if p == nil {
			return m.ReplyErr(fmt.Errorf("no pal %s", req.Name))
		}
		f := p.GetFeature(req.Feat)
		if f != nil {
			tmp := make([]pix.Color, 0, len(f.Colors)-req.Del+len(req.Ins))
			tmp = append(tmp, f.Colors[:req.Idx]...)
			tmp = append(tmp, req.Ins...)
			tmp = append(tmp, f.Colors[req.Idx+req.Del:]...)
			f.Colors = tmp
		} else if req.Idx == 0 && req.Del == 0 {
			f = &pix.Feature{Name: req.Feat, Colors: req.Ins}
			p.Feat = append(p.Feat, f)
		} else {
			return m.ReplyErr(fmt.Errorf("feature not found %s %s", req.Name, req.Feat))
		}
		err := r.Store.SavePal(p)
		if err != nil {
			return m.ReplyErr(err)
		}
		r.Bcast(site.RawMsg("pal.edit", req), 0)
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
				for _, s := range as.Conns {
					delete(r.Subs, s.ID())
				}
				delete(r.ASubs, a.Name)
			}
			r.Store.DropAsset(a.Name)
			r.Bcast(site.RawMsg(m.Subj, nameData{Name: name}), 0)
			return nil
		}
	case "asset.new":
		var req struct {
			pix.AssetInfo
			Copy string
		}
		m.Unmarshal(&req)
		if !NameCheck.MatchString(req.Name) {
			return m.ReplyErr(fmt.Errorf("invalid name %s", m.Raw))
		}
		if a := r.Store.Asset(req.Name); a != nil {
			return m.ReplyErr(fmt.Errorf("asset named %s exists", req.Name))
		}
		req.Dim = DefaultSize(req.Kind)
		if req.Pal == "" {
			req.Pal = "default"
		}
		req.Seq = []*pix.Seq{}
		pal := r.Store.Pal(req.Pal)
		if pal == nil && req.Pal == "default" {
			pal = DefaultPalette()
			r.Store.SavePal(pal)
		}
		a := pix.NewAsset(req.AssetInfo)
		err := r.Store.SaveAssetInfo(a)
		if err != nil {
			return m.ReplyErr(fmt.Errorf("saving asset: %v", err))
		}
		r.unsub(m.From.ID())
		as := &AssetSubs{Asset: a}
		r.ASubs[a.Name] = as
		r.sub(m.From, as)
		r.Bcast(site.RawMsg("asset.new", AssetInfo{Name: a.Name, Kind: a.Kind}), 0)
		return site.RawMsg("asset.open", a)
	case "seq.new", "seq.del", "seq.edit", "pic.edit":
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
	*pix.Seq
	Pics []*pix.Pic `json:"pics,omitempty"`
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
			err = r.Store.SaveAssetInfo(a.Asset)
			if err != nil {
				return m.ReplyErr(err)
			}
			a.Bcast(site.RawMsg("seq.del", nameData{Name: name}), 0)
			return nil
		}
		if s == nil {
			p := a.NewPic()
			s = a.AddSeq(name)
			s.IDs = []pix.PicID{p.ID}
			err = r.Store.SaveAssetInfo(a.Asset)
			if err != nil {
				return m.ReplyErr(err)
			}
			a.Bcast(site.RawMsg("seq.new", SeqData{s, []*pix.Pic{p}}), 0)
		}
		return site.RawMsg("seq.open", SeqData{s, a.GetPics(s.IDs...)})
	case "seq.edit":
		var req struct {
			Name string      `json:"name"`
			Idx  int         `json:"idx"`
			Del  int         `json:"del"`
			Ins  []pix.PicID `json:"ins"`
			Pics []*pix.Pic  `json:"pics"`
			Copy bool        `json:"copy,omitempty"`
		}
		err := m.Unmarshal(&req)
		s := a.GetSeq(req.Name)
		if s == nil {
			return m.ReplyErr(fmt.Errorf("sequence not found"))
		}
		for i, id := range req.Ins {
			var p *pix.Pic
			var save bool
			if id <= 0 {
				p = a.NewPic()
				save = true
			} else {
				p = a.Pics[id]
				if p == nil {
					p = a.NewPic()
					save = true
				} else if req.Copy {
					np := a.NewPic()
					np.Box = p.Box
					np.Raw = append(np.Raw[:0], p.Raw...)
					p = np
					save = true
				}
			}
			if save {
				req.Ins[i] = p.ID
				req.Pics = append(req.Pics, p)
				_, err = r.Store.SavePic(a.Asset, p.ID)
				if err != nil {
					return m.ReplyErr(err)
				}
			}
		}
		tmp := make([]pix.PicID, 0, len(s.IDs)-req.Del+len(req.Ins))
		tmp = append(tmp, s.IDs[:req.Idx]...)
		tmp = append(tmp, req.Ins...)
		tmp = append(tmp, s.IDs[req.Idx+req.Del:]...)
		s.IDs = tmp
		err = r.Store.SaveAssetInfo(a.Asset)
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
func (r *Room) getSub(c hub.Conn) *AssetSubs {
	return r.Subs[c.ID()].Asset
}
func (r *Room) sub(c hub.Conn, a *AssetSubs) {
	a.Conns = append(a.Conns, c)
	r.Subs[c.ID()] = Sub{Asset: a}
}
func (r *Room) unsub(id int64) {
	sub, ok := r.Subs[id]
	if ok {
		delete(r.Subs, id)
		if sub.Asset != nil {
			subs := sub.Asset.Conns
			for i, s := range subs {
				if s.ID() == id {
					subs = append(subs[:i], subs[i+1:]...)
					break
				}
			}
			sub.Asset.Conns = subs
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

var NameCheck = regexp.MustCompile(`^[a-z0-9_]+$`)

type Info struct {
	Assets []AssetInfo   `json:"assets,omitempty"`
	Pals   []pix.Palette `json:"pals,omitempty"`
}

func DefaultPalette() *pix.Palette {
	return &pix.Palette{Name: "default", Feat: []*pix.Feature{
		{Name: "basic", Colors: []pix.Color{0xffffff, 0x000000}},
		{Name: "skin", Colors: []pix.Color{0xffcbb8, 0xfca99a, 0xc58e81, 0x190605}},
		{Name: "eyes", Colors: []pix.Color{0xfffff0, 0x1a5779, 0x110100}},
		{Name: "hair", Colors: []pix.Color{0xf1ba60, 0xc47e31, 0x604523, 0x090100}},
		{Name: "shirt", Colors: []pix.Color{0xa9cc86, 0x6e8e52, 0x51683b, 0x040000}},
		{Name: "pants", Colors: []pix.Color{0x484a49, 0x303030, 0x282224, 0x170406}},
		{Name: "shoes", Colors: []pix.Color{0xb16f4b, 0x82503e, 0x3f1f15, 0x030000}},
	}}
}

func DefaultSize(kind string) (d geo.Dim) {
	d.W, d.H = 16, 16
	switch kind {
	case "char":
		d.W, d.H = 32, 40
	}
	return d
}
