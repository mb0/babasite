package chared

type Asset struct {
	ID   uint32 `json:"id"`
	Name string `json:"name"`
	Kind string `json:"kind"`
	Size
	Seq []*Sequence `json:"seq"`
	Pal Pallette    `json:"pal"`
}

type Size struct {
	W int `json:"w"`
	H int `json:"h"`
}

type Sequence struct {
	Name string    `json:"name"`
	Pics [][]int16 `json:"pics"`
}

type Pallette struct {
	ID     int      `json:"id"`
	Name   string   `json:"name"`
	Colors []uint32 `json:"colors"`
}

type Pic struct {
	Size
	Data []int16
}

func (p Size) ValidSel(s Sel) bool {
	return s.X >= 0 && s.Y >= 0 && s.X+s.W <= p.W && s.Y+s.H <= p.H
}
