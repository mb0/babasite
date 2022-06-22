package wedit

import (
	"github.com/mb0/babasite/game/gamed"
	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/pix"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

func palNew(ed *Editor, m *hub.Msg) error {
	req := ParseName(m)
	pal, err := ed.Pix.NewPal(req.Name)
	if err != nil {
		return err
	}
	// TODO add default features (based on img kind?)
	ed.Bcast(site.RawMsg(m.Subj, pal), 0)
	return nil
}
func palDel(ed *Editor, m *hub.Msg) error {
	req := ParseID[ids.Pal](m)
	// TODO check for references and decide what to do
	err := ed.Pix.Pal.Set(req.ID, nil)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func palEdit(ed *Editor, m *hub.Msg) error {
	var req pix.Pal
	m.Unmarshal(&req)
	sl := ed.Pix.Pal.Slot(req.ID)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	// TODO check req data
	sl.Data = req
	sl.MarkMod()
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func imgNew(ed *ConnSubs, m *hub.Msg) error {
	req := ParseName(m)
	pal, err := ed.Pix.NewPal(req.Name)
	if err != nil {
		return err
	}
	// TODO add default features (based on img kind?)
	ed.Bcast(site.RawMsg(m.Subj, pal), 0)
	return nil
}
func imgDel(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Img](m)
	// TODO check for references and decide what to do
	err := ed.Pix.Img.Set(req.ID, nil)
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
	hub.Send(m.From, site.RawMsg(m.Subj, PicsData{
		ID:   req.ID,
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
	// TODO check req data
	sl.Data = req
	sl.MarkMod()
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func clipNew(ed *ConnSubs, m *hub.Msg) error {
	req := ParseName(m)
	clip, err := ed.Pix.NewClip(req.Name)
	if err != nil {
		return err
	}
	// TODO add blank pic
	ed.Bcast(site.RawMsg(m.Subj, clip), 0)
	return nil
}
func clipDel(ed *ConnSubs, m *hub.Msg) error {
	req := ParseID[ids.Clip](m)
	// TODO check for references and decide what to do
	err := ed.Pix.Clip.Set(req.ID, nil)
	if err != nil {
		return err
	}
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}

func clipEdit(ed *ConnSubs, m *hub.Msg) error {
	var req pix.Clip
	m.Unmarshal(&req)
	sl := ed.Pix.Clip.Slot(req.ID)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	// TODO check req data
	sl.Data = req
	sl.MarkMod()
	ed.Bcast(site.RawMsg(m.Subj, req), 0)
	return nil
}
func picEdit(ed *ConnSubs, m *hub.Msg) error {
	var req gamed.EditPic
	m.Unmarshal(&req)
	img, err := ed.Pix.Img.Get(req.Img)
	if err != nil {
		return err
	}
	// apply edit
	sl := ed.Pix.Pic.Slot(req.Pic)
	if sl.Empty() {
		return ids.ErrNotFound
	}
	err = req.EditGrid.Apply(geo.Box{Dim: img.Dim}, &sl.Data.Pix)
	if err != nil {
		return err
	}
	sl.MarkMod()
	// share edit with all subscribers
	ed.Tops[img.ID].BcastRaw(m.Subj, req, 0)
	return nil
}
