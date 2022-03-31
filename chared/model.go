package chared

import "regexp"

var NameCheck = regexp.MustCompile(`^[a-z0-9_]+$`)

type Asset struct {
	Name string `json:"name"`
	Kind string `json:"kind"`
	Size
	Seq []*Sequence `json:"seq"`
	Pal Pallette    `json:"pal"`
}

func (a *Asset) GetSeq(name string) *Sequence {
	for _, s := range a.Seq {
		if s.Name == name {
			return s
		}
	}
	return nil
}
func (a *Asset) AddSeq(name string) *Sequence {
	if s := a.GetSeq(name); s != nil {
		return s
	}
	s := &Sequence{Name: name, Pics: [][]Pixel{a.newPic()}}
	a.Seq = append(a.Seq, s)
	return s
}
func (a *Asset) newPic() []Pixel { return make([]Pixel, a.W*a.H) }

// getPic returns the pic with index in sequence s or nil.
func (a *Asset) GetPic(seq string, index int) *Pic {
	pic := a.GetSeq(seq).GetPic(index)
	if pic != nil {
		return &Pic{Size: a.Size, Data: pic}
	}
	return nil
}

type Size struct {
	W int `json:"w"`
	H int `json:"h"`
}

type Pixel uint16

type Sequence struct {
	Name string    `json:"name"`
	Pics [][]Pixel `json:"pics"`
}

func (s *Sequence) GetPic(i int) []Pixel {
	if s != nil && i >= 0 && i < len(s.Pics) {
		return s.Pics[i]
	}
	return nil
}

type Pic struct {
	Size
	Data []Pixel
}

func (p Size) ValidSel(s Sel) bool {
	return s.X >= 0 && s.Y >= 0 && s.X+s.W <= p.W && s.Y+s.H <= p.H
}
