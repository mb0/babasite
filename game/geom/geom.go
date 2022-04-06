package geom

import "fmt"

type Pos struct {
	X int `json:"x"`
	Y int `json:"y"`
}

func (p Pos) Add(x, y int) Pos {
	p.X += x
	p.Y += y
	return p
}

func (p Pos) In(b Box) bool {
	return p.X >= b.X && p.X < b.X+b.W && p.Y >= b.Y && p.Y < b.Y+b.H
}

type Dim struct {
	W int `json:"w"`
	H int `json:"h"`
}

func (p Dim) Empty() bool { return p.W == 0 || p.H == 0 }

type Box struct {
	Pos
	Dim
}

func MakeBox(x, y, w, h int) Box {
	return Box{Pos: Pos{X: x, Y: y}, Dim: Dim{W: w, H: h}}
}

func (b Box) End() Pos { return b.Add(b.W-1, b.H-1) }

func (b Box) Contains(o Box) bool { return o.In(b) && o.End().In(b) }
func (b Box) ValidSel(o Box) bool { return o.In(b) && o.End().In(b) }
func (b Box) Grow(o Box) Box {
	if b.Empty() {
		return o
	}
	e, be := o.End(), b.End()
	if o.X > b.X {
		o.X = b.X
	}
	if o.Y > b.Y {
		o.Y = b.Y
	}
	if e.X < be.X {
		e.X = be.X
	}
	if e.Y < be.Y {
		e.Y = be.Y
	}
	o.Dim = Dim{W: 1 + e.X - o.X, H: 1 + e.Y - o.Y}
	return o
}
func (b Box) Crop(o Box) Box {
	e, be := o.End(), b.End()
	if o.X < b.X {
		o.X = b.X
	}
	if o.Y < b.Y {
		o.Y = b.Y
	}
	if e.X > be.X {
		e.X = be.X
	}
	if e.Y > be.Y {
		e.Y = be.Y
	}
	o.Dim = Dim{W: 1 + e.X - o.X, H: 1 + e.Y - o.Y}
	return o
}
func (b Box) MarshalBinary() ([]byte, error) {
	return writeUint16(make([]byte, 8),
		uint16(b.X), uint16(b.Y),
		uint16(b.W), uint16(b.H),
	), nil
}
func (b *Box) UnmarshalBinary(r []byte) error {
	if len(r) < 8 {
		return fmt.Errorf("not enough bytes")
	}
	b.X = int(readUint16(r))
	b.Y = int(readUint16(r[2:]))
	b.W = int(readUint16(r[4:]))
	b.H = int(readUint16(r[6:]))
	return nil
}

func readUint16(raw []byte) uint16 {
	return uint16(raw[0])<<8 | uint16(raw[1])
}
func writeUint16(b []byte, us ...uint16) []byte {
	for _, u := range us {
		b = append(b, byte(u>>8), byte(u))
	}
	return b
}
