package pix

import "fmt"

type Sys struct {
	Assets map[string]*Asset
	Pals   map[string]*Palette
}

func NewSys() *Sys {
	return &Sys{
		Assets: make(map[string]*Asset),
		Pals:   make(map[string]*Palette),
	}
}

func (s *Sys) Pal(name string) *Palette { return s.Pals[name] }

func (s *Sys) Asset(name string) *Asset { return s.Assets[name] }

func (s *Sys) Pics(name string, ids ...PicID) ([]*Pic, error) {
	a := s.Assets[name]
	if a == nil {
		return nil, fmt.Errorf("asset %s not found", name)
	}
	return a.GetPics(ids...), nil
}
