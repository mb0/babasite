package geo

type Pos struct {
	X int `json:"x"`
	Y int `json:"y"`
}

func (p Pos) Add(x, y int) Pos {
	p.X += x
	p.Y += y
	return p
}
func (p Pos) Sub(x, y int) Pos {
	p.X -= x
	p.Y -= y
	return p
}
func (p Pos) Min(o Pos) Pos {
	if p.X > o.X {
		p.X = o.X
	}
	if p.Y > o.Y {
		p.Y = o.Y
	}
	return p
}
func (p Pos) Max(o Pos) Pos {
	if p.X < o.X {
		p.X = o.X
	}
	if p.Y < o.Y {
		p.Y = o.Y
	}
	return p
}
func (p Pos) In(b Box) bool {
	return p.X >= b.X && p.X < b.X+b.W && p.Y >= b.Y && p.Y < b.Y+b.H
}

type Dim struct {
	W int `json:"w"`
	H int `json:"h"`
}

func (p Dim) Empty() bool { return p.W*p.H <= 0 }

type Box struct {
	Pos
	Dim
}

func UnitBox(p Pos) Box { return Box{Pos: p, Dim: Dim{W: 1, H: 1}} }
func MakeBox(x, y, w, h int) Box {
	return Box{Pos: Pos{X: x, Y: y}, Dim: Dim{W: w, H: h}}
}

func (b Box) End() Pos      { return b.Add(b.W-1, b.H-1) }
func (b Box) BoxDim() Dim   { return Dim{W: b.X + b.W, H: b.Y + b.H} }
func (b Box) In(o Box) bool { return b.Pos.In(o) && b.End().In(o) }
func (b Box) BoxIdx(p Pos) int {
	p = p.Sub(b.X, b.Y)
	return p.Y*b.W + p.X
}

func (b Box) Crop(o Box) Box {
	if b.Empty() || o.Empty() {
		return Box{}
	}
	p := o.Max(b.Pos)
	e := o.End().Min(b.End())
	return Box{Pos: p, Dim: Dim{W: 1 + e.X - p.X, H: 1 + e.Y - p.Y}}
}

func (b Box) Grow(o Box) Box {
	if b.Empty() {
		return o
	}
	p := o.Min(b.Pos)
	e := o.End().Max(b.End())
	return Box{Pos: p, Dim: Dim{W: 1 + e.X - p.X, H: 1 + e.Y - p.Y}}
}
