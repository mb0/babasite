package pix

import (
	"fmt"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/ids"
)

type PalTable = ids.ListTable[ids.Pal, Pal, *Pal]
type ImgTable = ids.ListTable[ids.Img, Img, *Img]
type ClipTable = ids.ListTable[ids.Clip, Clip, *Clip]
type PicTable = ids.ListTable[ids.Pic, Pic, *Pic]

type Sys struct {
	Pal  PalTable
	Img  ImgTable
	Clip ClipTable
	Pic  PicTable
}

func (s *Sys) NewPal(name string) (*Pal, error) {
	err := ids.NamedUnique(&s.Pal, name)
	if err != nil {
		return nil, err
	}
	pal, err := s.Pal.New()
	if err != nil {
		return nil, err
	}
	pal.Name = name
	pal.Feats = []*Feat{
		{Name: "basic", Colors: []Color{0xffffff, 0x000000}},
	}
	if name == "default" {
		pal.Feats = append(pal.Feats, []*Feat{
			{Name: "skin", Colors: []Color{0xffcbb8, 0xfca99a, 0xc58e81, 0x190605}},
			{Name: "eyes", Colors: []Color{0xfffff0, 0x1a5779, 0x110100}},
			{Name: "hair", Colors: []Color{0xf1ba60, 0xc47e31, 0x604523, 0x090100}},
			{Name: "shirt", Colors: []Color{0xa9cc86, 0x6e8e52, 0x51683b, 0x040000}},
			{Name: "pants", Colors: []Color{0x484a49, 0x303030, 0x282224, 0x170406}},
			{Name: "shoes", Colors: []Color{0xb16f4b, 0x82503e, 0x3f1f15, 0x030000}},
		}...)
	}
	return pal, nil
}

func (s *Sys) NewImg(a Img) (*Img, error) {
	// TODO check a kind
	err := ids.NamedUnique(&s.Img, a.Name)
	if err != nil {
		return nil, err
	}
	img, err := s.Img.New()
	if err != nil {
		return nil, err
	}
	img.Name = a.Name
	img.Kind = a.Kind
	img.Dim = s.defDim(a.Kind, a.Dim)
	img.Pal = s.defPal(a.Pal)

	clip, err := s.Clip.New()
	if err != nil {
		return nil, err
	}
	clip.Img = img.ID
	clip.Dim = img.Dim
	p, err := s.Pic.New()
	if err != nil {
		return nil, err
	}
	clip.Seq = []Frame{{Pic: p.ID}}
	return img, nil
}

func (s *Sys) GetClip(img ids.Img, name string) *Clip {
	return s.Clip.Find(func(p *Clip) bool {
		return p.Img == img && p.Name == name
	})
}
func (s *Sys) NewClip(req Clip) (*Clip, error) {
	err := ClipNamedUnique(&s.Clip, req.Img, req.Name)
	if err != nil {
		return nil, err
	}
	if img, _ := s.Img.Get(req.Img); img == nil {
		return nil, fmt.Errorf("img %d does not exist", req.Img)
	}
	clip, err := s.Clip.New()
	if err != nil {
		return nil, err
	}
	clip.Name = req.Name
	clip.Img = req.Img
	clip.Dim = req.Dim
	clip.Seq = req.Seq
	clip.Loop = req.Loop
	// check seq and add frame with blank pic if empty
	if len(clip.Seq) == 0 {
		p, err := s.Pic.New()
		if err != nil {
			return nil, err
		}
		clip.Seq = []Frame{{Pic: p.ID}}
	}
	return clip, nil
}

func ClipNamedUnique(lt *ids.ListTable[ids.Clip, Clip, *Clip], img ids.Img, name string) error {
	if !ids.NameCheck.MatchString(name) {
		return fmt.Errorf("name invalid")
	}
	dup := lt.Find(func(p *Clip) bool {
		return p.Img == img && p.Name == name
	})
	if dup != nil {
		return fmt.Errorf("name already exists")
	}
	return nil
}

func (s *Sys) defDim(kind string, d geo.Dim) geo.Dim {
	if d.W > 0 || d.H > 0 {
		if d.W <= 0 {
			d.W = d.H
		} else if d.H <= 0 {
			d.H = d.W
		}
		return d
	}
	switch kind {
	case "char":
		return geo.Dim{W: 32, H: 40}
	case "tile":
		return geo.Dim{W: 16, H: 16}
	case "obj":
		return geo.Dim{W: 32, H: 32}
	}
	return geo.Dim{W: 24, H: 24}
}
func (s *Sys) defPal(id ids.Pal) ids.Pal {
	p, _ := s.Pal.Get(id)
	if p == nil {
		p = ids.NamedFind(&s.Pal, "default")
	}
	if p == nil {
		p, _ = s.NewPal("default")
		if p == nil {
			return 0
		}
	}
	return p.ID
}
