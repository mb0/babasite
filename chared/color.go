package chared

import (
	"fmt"
	"strconv"
)

func DefaultPallette() *Pallette {
	return &Pallette{Name: "default", Feat: []*Feature{
		{Name: "basic", Colors: []Color{0xffffff, 0x000000}},
		{Name: "skin", Colors: []Color{0xffcbb8, 0xfca99a, 0xc58e81, 0x190605}},
		{Name: "eyes", Colors: []Color{0xfffff0, 0x1a5779, 0x110100}},
		{Name: "hair", Colors: []Color{0xf1ba60, 0xc47e31, 0x604523, 0x090100}},
		{Name: "shirt", Colors: []Color{0xa9cc86, 0x6e8e52, 0x51683b, 0x040000}},
		{Name: "pants", Colors: []Color{0x484a49, 0x303030, 0x282224, 0x170406}},
		{Name: "shoes", Colors: []Color{0xb16f4b, 0x82503e, 0x3f1f15, 0x030000}},
	}}
}

type Pallette struct {
	Name string     `json:"name"`
	Feat []*Feature `json:"feat"`
}

func (pal *Pallette) GetFeature(name string) *Feature {
	for _, f := range pal.Feat {
		if f.Name == name {
			return f
		}
	}
	return nil
}

func (pal *Pallette) Color(p Pixel) Color {
	f, c := int(p/100), int(p%100)
	if f < len(pal.Feat) {
		feat := pal.Feat[f]
		if c < len(feat.Colors) {
			return feat.Colors[c]
		}
	}
	return 0
}

type Feature struct {
	Name   string  `json:"name"`
	Colors []Color `json:"colors"`
}

type Color uint32

func RGB(r, g, b uint8) Color { return Color(r)<<16 | Color(g)<<8 | Color(b) }
func (c Color) R() uint8      { return uint8(c >> 16) }
func (c Color) G() uint8      { return uint8(c >> 8) }
func (c Color) B() uint8      { return uint8(c) }
func (c Color) O() uint8      { return uint8((c >> 24) & 0x7f) }
func (c Color) A() uint8      { return 100 - c.O() }
func (c Color) Max() (m uint8) {
	for i := 0; i < 3; i++ {
		if v := uint8(c >> (i * 8)); v > m {
			m = v
		}
	}
	return m
}

func (c Color) MarshalText() ([]byte, error) {
	return []byte(fmt.Sprintf("%06x", c)), nil
}
func (c *Color) UnmarshalText(raw []byte) error {
	u, err := strconv.ParseUint(string(raw), 16, 32)
	*c = Color(u)
	return err
}

// Shades returns a list of four different shades of the given color.
// From lightest to darkest: lighter, color, darker and outline
func Shades(color Color) []Color {
	r, g, b := color.R(), color.G(), color.B()
	lighter := RGB(r+25, g+25, b+25)
	darker := RGB(r-25, g-25, b-25)
	d := color.Max() - 25
	outline := RGB(r-d, g-d, b-d)
	return []Color{lighter, color, darker, outline}
}
