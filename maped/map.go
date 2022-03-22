package maped

type Tile uint32

type Size struct {
	W int `json:"w,omitempty"`
	H int `json:"h,omitempty"`
}

type Map struct {
	Name string `json:"name"`
	Size
	Tileset *Tileset `json:"tileset,omitempty"`
	Tiles   []Tile   `json:"tiles"`
}

func NewMap(name string, w, h int, set *Tileset) *Map {
	if set == nil {
		set = &DefaultTileset
	}
	return &Map{Name: name, Size: Size{W: w, H: h}, Tileset: set,
		Tiles: make([]Tile, h*w),
	}
}

type TileInfo struct {
	Tile  Tile   `json:"tile"`
	Name  string `json:"name"`
	Color uint32 `json:"color"`
	Block bool   `json:"block"`
}

type Tileset struct {
	Name  string     `json:"name"`
	Infos []TileInfo `json:"infos"`
}

var DefaultTileset = Tileset{Name: "default", Infos: []TileInfo{
	{Tile: 0, Name: "void", Color: 0xffffff, Block: true},
	{Tile: 1, Name: "water", Color: 0x0000ff, Block: true},
	{Tile: 2, Name: "lava", Color: 0xff0000, Block: true},
	{Tile: 3, Name: "wall", Color: 0x888888, Block: true},
	{Tile: 10, Name: "dirt", Color: 0x92865f},
	{Tile: 11, Name: "grass", Color: 0x718144},
	{Tile: 12, Name: "path", Color: 0xb4ac88},
	{Tile: 13, Name: "street", Color: 0x505158},
	{Tile: 100, Name: "door", Block: true},
	{Tile: 200, Name: "window", Block: true},
	{Tile: 300, Name: "crate", Block: true},
	{Tile: 400, Name: "chest", Block: true},
	{Tile: 500, Name: "locker", Block: true},
}}
