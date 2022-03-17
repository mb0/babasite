package main

/*
 drei nachbarn -> neu geboren in der nächsten phase
 weniger als zwei nachbarn -> einsam, stirbt in der nächsten phase
 mit zwei oder drei -> bleibt
 mit mehr als drei -> überbevölkert, stirbt in der nächsten phase
*/
type Map struct {
	W     int    `json:"w"`
	H     int    `json:"h"`
	Tiles []Tile `json:"tiles"`
}

func NewMap(w, h int) *Map {
	return &Map{W: w, H: h, Tiles: make([]Tile, h*w)}
}

func (m *Map) Step() {
	for i, t := range m.Tiles {
		if t == TileBirth {
			m.Tiles[i] = TileAlive
		} else if t == TileDeath {
			m.Tiles[i] = TileNone
		}
	}
	for i, t := range m.Tiles {
		y := i / m.W
		x := i % m.W
		count := m.Neighbours(x, y)
		if t >= TileAlive {
			if count < 2 || count > 3 {
				m.Tiles[i] = TileDeath
			}
		} else {
			if count == 3 {
				m.Tiles[i] = TileBirth
			}
		}
	}
}

// Neightbours return the count of neighboring tiles that are alive.
func (m *Map) Neighbours(x, y int) int {
	var count int
	for y1 := y - 1; y1 <= y+1; y1++ {
		if y1 < 0 || y1 >= m.H {
			continue
		}
		for x1 := x - 1; x1 <= x+1; x1++ {
			if x1 < 0 || x1 >= m.W {
				continue
			}
			if y1 == y && x1 == x {
				continue
			}
			if m.Tiles[y1*m.W+x1] >= TileAlive {
				count++
			}
		}
	}
	return count
}

func (m *Map) Click(x, y int) {
	m.Tiles[y*m.W+x].Toggle()
}

type Tile int8

const (
	TileBirth Tile = -1
	TileNone  Tile = 0
	TileAlive Tile = 1
	TileDeath Tile = 2
)

func (t Tile) Active() bool {
	return t >= TileAlive
}

func (t *Tile) Toggle() {
	if *t < TileAlive {
		*t = TileAlive
	} else {
		*t = TileNone
	}
}
