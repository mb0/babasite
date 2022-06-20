package pix

import (
	"fmt"

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

func (s *Sys) GetPal(name string) *Pal {
	return s.Pal.Find(func(p *Pal) bool {
		return p.Name == name
	})
}
func (s *Sys) NewPal(name string) (*Pal, error) {
	if !ids.NameCheck.MatchString(name) {
		return nil, fmt.Errorf("invalid name %s", name)
	}
	if old := s.GetPal(name); old != nil {
		return nil, fmt.Errorf("pal %s already exists", name)
	}
	pal, err := s.Pal.New()
	if err != nil {
		return nil, err
	}
	pal.Name = name
	return pal, nil
}

func (s *Sys) GetImg(name string) *Img {
	return s.Img.Find(func(p *Img) bool {
		return p.Name == name
	})
}
func (s *Sys) NewImg(name string) (*Img, error) {
	if !ids.NameCheck.MatchString(name) {
		return nil, fmt.Errorf("invalid name %s", name)
	}
	if old := s.GetImg(name); old != nil {
		return nil, fmt.Errorf("img %s already exists", name)
	}
	img, err := s.Img.New()
	if err != nil {
		return nil, err
	}
	img.Name = name
	return img, nil
}

func (s *Sys) GetClip(name string) *Clip {
	return s.Clip.Find(func(p *Clip) bool {
		return p.Name == name
	})
}
func (s *Sys) NewClip(name string) (*Clip, error) {
	if !ids.NameCheck.MatchString(name) {
		return nil, fmt.Errorf("invalid name %s", name)
	}
	if old := s.GetClip(name); old != nil {
		return nil, fmt.Errorf("img %s already exists", name)
	}
	clip, err := s.Clip.New()
	if err != nil {
		return nil, err
	}
	clip.Name = name
	return clip, nil
}
