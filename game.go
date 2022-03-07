package main

type Map struct {
	// m.Tiles[0] = []Tile // Line
	// m.Tiles[0][1] = Tile
	// m.Tiles[0][1].Active() // int8
	Tiles [][]Tile `json:"tiles"`
}

func NewMap(w, h int) *Map {
	tiles := make([][]Tile, h)
	for i := range tiles {
		tiles[i] = make([]Tile, w)
	}
	return &Map{Tiles: tiles}
}

func (m *Map) Click(x, y int) {
	m.Tiles[y][x].Toggle()
}

type Tile int8

func (t Tile) Active() bool {
	return t > 0
}

func (t *Tile) Toggle() {
	if *t == 0 {
		*t = 1
	} else {
		*t = 0
	}
}
