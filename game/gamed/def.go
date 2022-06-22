package gamed

import (
	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/lvl"
	"github.com/mb0/babasite/game/pix"
)

var NameCheck = ids.NameCheck

var DefaultTileset = lvl.Tset{Name: "default", Infos: []lvl.TileInfo{
	{Tile: 0, Name: "void", Color: 0xffffff, Block: true, Group: "basic"},
	{Tile: 1, Name: "wall", Color: 0x888888, Block: true, Group: "basic"},
}}

func DefaultPalette() *pix.Pal {
	return &pix.Pal{Name: "default", Feats: []*pix.Feat{
		{Name: "basic", Colors: []pix.Color{0xffffff, 0x000000}},
		{Name: "skin", Colors: []pix.Color{0xffcbb8, 0xfca99a, 0xc58e81, 0x190605}},
		{Name: "eyes", Colors: []pix.Color{0xfffff0, 0x1a5779, 0x110100}},
		{Name: "hair", Colors: []pix.Color{0xf1ba60, 0xc47e31, 0x604523, 0x090100}},
		{Name: "shirt", Colors: []pix.Color{0xa9cc86, 0x6e8e52, 0x51683b, 0x040000}},
		{Name: "pants", Colors: []pix.Color{0x484a49, 0x303030, 0x282224, 0x170406}},
		{Name: "shoes", Colors: []pix.Color{0xb16f4b, 0x82503e, 0x3f1f15, 0x030000}},
	}}
}

func DefaultSize(kind string) (d geo.Dim) {
	d.W, d.H = 16, 16
	switch kind {
	case "char":
		d.W, d.H = 32, 40
	}
	return d
}
