package game

import (
	"github.com/mb0/babasite/game/dia"
	"github.com/mb0/babasite/game/inv"
	"github.com/mb0/babasite/game/lvl"
	"github.com/mb0/babasite/game/obj"
	"github.com/mb0/babasite/game/pix"
)

type World struct {
	WorldMeta
	Pix pix.Sys
	Lvl lvl.Sys
	Obj obj.Sys
	Inv inv.Sys
	Dia dia.Sys
}

type Game struct {
	GameMeta
	World
	// Game also has players, path and other sub systems
}

func (w *World) Info() WorldData {
	return WorldData{WorldMeta: w.WorldMeta,
		Pal:  w.Pix.Pal.All(nil),
		Img:  w.Pix.Img.All(nil),
		Clip: w.Pix.Clip.All(nil),
		Tset: w.Lvl.Tset.All(nil),
		Lvl:  w.Lvl.Lvl.All(nil),
	}
}

type WorldData struct {
	WorldMeta
	Pal  []*pix.Pal     `json:"pal"`
	Img  []*pix.Img     `json:"img"`
	Clip []*pix.Clip    `json:"clip"`
	Tset []*lvl.Tileset `json:"tset"`
	Lvl  []*lvl.Lvl     `json:"lvl"`
}
