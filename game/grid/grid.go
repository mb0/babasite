package grid

import (
	"github.com/mb0/babasite/game/geo"
)

type EachFunc[T any] func(geo.Pos, T)
type FindFunc[T any] func(geo.Pos, T) bool

type Grid[T any] interface {
	B() geo.Box
	Get(geo.Pos) T
	Set(geo.Pos, T)
}

type Tiles[T ~uint16] struct {
	Data
}

func (g *Tiles[T]) Get(p geo.Pos) T {
	idx := g.BoxIdx(p)
	return T(g.Raw[idx])
}
func (g *Tiles[T]) Set(p geo.Pos, t T) {
	idx := g.BoxIdx(p)
	g.Raw[idx] = uint16(t)
}

type Sel struct {
	Data
}

func (g *Sel) Get(p geo.Pos) bool {
	idx := g.BoxIdx(p)
	bit := uint16(1 << (idx & 0xf))
	return (g.Raw[idx>>4] & bit) != 0
}

func (g *Sel) Set(p geo.Pos, t bool) {
	idx := g.BoxIdx(p)
	bit := uint16(1 << (idx & 0xf))
	if !t {
		bit = ^bit
	}
	g.Raw[idx>>4] &= bit
}

func Each[T any](g Grid[T], f EachFunc[T]) {
	eachIn(g, g.B(), f)
}
func EachIn[T any](g Grid[T], b geo.Box, f EachFunc[T]) {
	eachIn(g, b.Crop(g.B()), f)
}
func EachNot[T comparable](g Grid[T], f EachFunc[T], not T) {
	eachIn(g, g.B(), func(p geo.Pos, t T) {
		if t != not {
			f(p, t)
		}
	})
}
func EachInNot[T comparable](g Grid[T], b geo.Box, f EachFunc[T], not T) {
	eachIn(g, b.Crop(g.B()), func(p geo.Pos, t T) {
		if t != not {
			f(p, t)
		}
	})
}
func eachIn[T any](g Grid[T], b geo.Box, f EachFunc[T]) {
	if b.Empty() {
		return
	}
	d := b.BoxDim()
	for p := b.Pos; p.Y < d.H; p.Y++ {
		for p.X = b.X; p.X < d.W; p.X++ {
			f(p, g.Get(p))
		}
	}
}
func Find[T any](g Grid[T], f FindFunc[T]) (T, bool) {
	return findIn(g, g.B(), f)
}
func FindIn[T any](g Grid[T], b geo.Box, f FindFunc[T]) (T, bool) {
	return findIn(g, b.Crop(g.B()), f)
}
func findIn[T any](g Grid[T], b geo.Box, f FindFunc[T]) (res T, ok bool) {
	if b.Empty() {
		return res, false
	}
	d := b.BoxDim()
	for p := b.Pos; p.Y < d.H; p.Y++ {
		for p.X = b.X; p.X < d.W; p.X++ {
			if t := g.Get(p); f(p, t) {
				return t, true
			}
		}
	}
	return res, false
}
