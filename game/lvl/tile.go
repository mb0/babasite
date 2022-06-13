package lvl

import "github.com/mb0/babasite/game/pix"

type Tileset struct {
	Name  string     `json:"name"`
	Infos []TileInfo `json:"infos"`
}

type TileInfo struct {
	Tile  Tile          `json:"tile"`
	Name  string        `json:"name"`
	Color uint32        `json:"color"`
	Block bool          `json:"block,omitempty"`
	Group string        `json:"group,omitempty"`
	Asset pix.AssetPath `json:"asset,omitempty"`
}
