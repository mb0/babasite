package main

/*
 drei nachbarn -> neu geboren in der nächsten phase
 weniger als zwei nachbarn -> einsam, stirbt in der nächsten phase
 mit zwei oder drei -> bleibt
 mit mehr als drei -> überbevölkert, stirbt in der nächsten phase
*/
type Map struct {
	Tiles [][]Tile `json:"tiles"`
}

func NewMap(w, h int) *Map {
	tiles := make([][]Tile, h)
	for i := range tiles {
		tiles[i] = make([]Tile, w)
	}
	return &Map{Tiles: tiles}
}

func (m *Map) Step() {
	for y, row := range m.Tiles {
		for x, t := range row {
			if t == TileBirth {
				m.Tiles[y][x] = TileAlive
			} else if t == TileDeath {
				m.Tiles[y][x] = TileNone
			}
		}
	}
	for y, row := range m.Tiles {
		for x, t := range row {
			count := m.Neighbours(x, y)
			if t >= TileAlive {
				if count < 2 || count > 3 {
					m.Tiles[y][x] = TileDeath
				}
			} else {
				if count == 3 {
					m.Tiles[y][x] = TileBirth
				}
			}
		}
	}
}

// Neightbours return the count of neighboring tiles that are alive.
func (m *Map) Neighbours(x, y int) int {
	var count int
	for y1 := y - 1; y1 <= y+1; y1++ {
		if y1 < 0 || y1 >= len(m.Tiles) {
			continue
		}
		row := m.Tiles[y1]
		for x1 := x - 1; x1 <= x+1; x1++ {
			if x1 < 0 || x1 >= len(row) {
				continue
			}
			if y1 == y && x1 == x {
				continue
			}
			if row[x1] >= TileAlive {
				count++
			}
		}
	}
	return count
}

func (m *Map) Click(x, y int) {
	m.Tiles[y][x].Toggle()
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
