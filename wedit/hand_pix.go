package wedit

import (
	"fmt"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/pix"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

func palNew(ed *ConnSubs, m *hub.Msg) error {
	req := ParseName(m)
	pal, err := ed.Pix.NewPal(req.Name)
	if err != nil {
		return err
	}
	// TODO add default features (based on img kind?)
	ed.Bcast(site.RawMsg(m.Subj, pal), 0)
	return nil
}
func palDel(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Pal](m)
	err := ed.Pix.DelPal(req.ID)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func palEdit(ed *ConnSubs, m *hub.Msg) (err error) {
	var req struct {
		ID    ids.Pal     `json:"id,omitempty"`
		Name  *string     `json:"name,omitempty"`
		Kind  *string     `json:"kind,omitempty"`
		Feats []*pix.Feat `json:"feats,omitempty"`
		SliceReq[*pix.Feat]
	}
	m.Unmarshal(&req)
	sl := ed.Pix.Pal.Slot(req.ID)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	res := &sl.Data
	if req.Name != nil {
		// TODO check uniqueness
		res.Name = *req.Name
	}
	if req.Kind != nil {
		// TODO check kind
		res.Kind = *req.Kind
	}
	res.Feats, err = req.Apply(res.Feats, req.Feats)
	if err != nil {
		return err
	}
	sl.MarkMod()
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func palFeat(ed *ConnSubs, m *hub.Msg) (err error) {
	var req struct {
		ID   ids.Pal     `json:"id,omitempty"`
		Feat string      `json:"feat,omitempty"`
		Ins  []pix.Color `json:"ins,omitempty"`
		SliceReq[pix.Color]
	}
	m.Unmarshal(&req)
	sl := ed.Pix.Pal.Slot(req.ID)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	res := &sl.Data
	f := res.Feat(req.Feat)
	if f == nil {
		f = &pix.Feat{Name: req.Feat}
		res.Feats = append(res.Feats, f)
	}
	f.Colors, err = req.Apply(f.Colors, req.Ins)
	if err != nil {
		return err
	}
	sl.MarkMod()
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}

func spotNew(ed *ConnSubs, m *hub.Msg) error {
	var req pix.Spot
	m.Unmarshal(&req)
	sp, err := ed.Pix.NewSpot(req)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, sp), 0)
	return nil
}
func spotDel(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Spot](m)
	err := ed.Pix.DelSpot(req.ID)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func spotEdit(ed *ConnSubs, m *hub.Msg) error {
	var req pix.Spot
	m.Unmarshal(&req)
	sl := ed.Pix.Spot.Slot(req.ID)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	res := &sl.Data
	if n := req.Name; n != "" && n != res.Name {
		// check uniqueness
		if old := ids.NamedFind(&ed.Pix.Spot, n); old != nil {
			return fmt.Errorf("spot %s already exists", n)
		}
		res.Name = n
	}
	sl.MarkMod()
	ed.Bcast(site.RawMsg(m.Subj, res), 0)
	return nil
}

func imgNew(ed *ConnSubs, m *hub.Msg) error {
	var req struct {
		pix.Img
		Open bool `json:"open"`
	}
	m.Unmarshal(&req)
	img, err := ed.Pix.NewImg(req.Img)
	if err != nil {
		return err
	}
	if img.Pal == 0 {
		p := ids.NamedFind(&ed.Pix.Pal, "default")
		if p == nil {
			p, err = ed.Pix.NewPal("default")
			if err == nil {
				ed.Bcast(site.RawMsg("pal.new", p), 0)
			}
		}
		if p != nil {
			img.Pal = p.ID
		}
	}
	ed.Bcast(site.RawMsg(m.Subj, img), 0)
	if req.Open {
		return sendImgOpen(ed, img)
	}
	return nil
}
func imgDel(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Img](m)
	err := ed.Pix.DelImg(req.ID)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func imgOpen(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Img](m)
	img, err := ed.Pix.Img.Get(req.ID)
	if err != nil {
		return err
	}
	return sendImgOpen(ed, img)
}
func sendImgOpen(ed *ConnSubs, img *pix.Img) error {
	ids := make(ids.List[ids.Pic], 0, 32)
	ed.Pix.Clip.Find(func(c *pix.Clip) bool {
		if c.Img == img.ID {
			for _, fr := range c.Seq {
				ids = append(ids, fr.Pic)
			}
		}
		return false
	})
	ids = ids.Unique()
	res := make([]*pix.Pic, 0, len(ids))
	for _, id := range ids {
		p, _ := ed.Pix.Pic.Get(id)
		if p != nil {
			res = append(res, p)
		}
	}
	ed.SubTop(img.ID)
	hub.Send(ed.Conn, site.RawMsg("img.open", PicsData{
		ID:   img.ID,
		Pics: res,
	}))
	return nil
}
func imgClose(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Img](m)
	ed.UnsubTop(req.ID)
	return nil
}

type PicsData struct {
	ID   ids.Img    `json:"id"`
	Pics []*pix.Pic `json:"pics"`
}

func imgEdit(ed *ConnSubs, m *hub.Msg) error {
	var req pix.Img
	m.Unmarshal(&req)
	sl := ed.Pix.Img.Slot(req.ID)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	res := &sl.Data
	if n := req.Name; n != "" && n != res.Name {
		// check uniqueness
		if old := ids.NamedFind(&ed.Pix.Pal, n); old != nil {
			return fmt.Errorf("pal %s already exists", n)
		}
		res.Name = n
	}
	if k := req.Kind; k != "" && k != res.Kind {
		// TODO check kind
		res.Kind = k
	}
	if req.W > 0 {
		res.W = req.W
	}
	if req.H > 0 {
		res.H = req.H
	}
	if req.Pal > 0 && req.Pal != res.Pal {
		// check if pal exists
		_, err := ed.Pix.Pal.Get(req.Pal)
		if err != nil {
			return fmt.Errorf("pal %w", err)
		}
		res.Pal = req.Pal
	}
	sl.MarkMod()
	ed.Bcast(site.RawMsg(m.Subj, res), 0)
	return nil
}
func clipNew(ed *ConnSubs, m *hub.Msg) error {
	var req pix.Clip
	m.Unmarshal(&req)
	clip, err := ed.Pix.NewClip(req)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, clip), 0)
	return nil
}
func clipDel(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Clip](m)
	err := ed.Pix.DelClip(req.ID)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}

func clipEdit(ed *ConnSubs, m *hub.Msg) (err error) {
	var req struct {
		ID   ids.Clip    `json:"id"`
		Name *string     `json:"name,omitempty"`
		W    int         `json:"w,omitempty"`
		H    int         `json:"h,omitempty"`
		Seq  []pix.Frame `json:"seq,omitempty"`
		Loop *bool       `json:"loop,omitempty"`
		SliceReq[pix.Frame]
		Pics []*pix.Pic `json:"pics,omitempty"`
	}
	m.Unmarshal(&req)
	sl := ed.Pix.Clip.Slot(req.ID)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	res := &sl.Data
	if req.Name != nil {
		if n := *req.Name; n != res.Name {
			// check uniqueness
			if err := pix.ClipNamedUnique(&ed.Pix.Clip, res.Img, *req.Name); err != nil {
				return err
			}
			res.Name = *req.Name
		}
	}
	var resize bool
	if req.W > 0 && req.W != res.W {
		resize = true
		res.W = req.W
	}
	if req.H > 0 && req.H != res.H {
		resize = true
		res.H = req.H
	}
	if resize {
		// TODO resize all clip pics?
	}
	if req.Loop != nil {
		res.Loop = *req.Loop
	}
	for i, fr := range req.Seq {
		var p *pix.Pic
		if fr.Pic == 0 {
			p, err = ed.Pix.Pic.New()
			if err != nil {
				return err
			}
		} else {
			p, err = ed.Pix.Pic.Get(fr.Pic)
			if err != nil {
				return err
			}
			if !req.Copy {
				continue
			}
			np, _ := ed.Pix.Pic.New()
			np.Box = p.Box
			np.Raw = append(np.Raw[:0], p.Raw...)
			p = np
		}
		req.Seq[i].Pic = p.ID
		req.Pics = append(req.Pics, p)
	}
	res.Seq, err = req.Apply(res.Seq, req.Seq)
	if err != nil {
		return err
	}
	sl.MarkMod()
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func picEdit(ed *ConnSubs, m *hub.Msg) error {
	var req struct {
		Clip ids.Clip `json:"clip"`
		Pic  ids.Pic  `json:"pic"`
		grid.Edit[pix.Pixel]
	}
	m.Unmarshal(&req)
	cl, err := ed.Pix.Clip.Get(req.Clip)
	if err != nil {
		return err
	}
	img, err := ed.Pix.Img.Get(cl.Img)
	if err != nil {
		return err
	}
	// apply edit
	sl := ed.Pix.Pic.Slot(req.Pic)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	err = req.Apply(geo.Box{Dim: cl.Dim}, &sl.Data.Pix)
	if err != nil {
		return err
	}
	sl.MarkMod()
	// share edit with all subscribers
	ed.Tops[img.ID].BcastRaw(m.Subj, req, 0)
	return nil
}
