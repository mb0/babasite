package pix

import (
	"fmt"
	"strconv"
)

type Color uint32

func RGB(r, g, b uint8) Color        { return Color(r)<<16 | Color(g)<<8 | Color(b) }
func RGBT(r, g, b, t uint8) Color    { return Color(r)<<16 | Color(g)<<8 | Color(b) }
func (c Color) RGB() (r, g, b uint8) { return uint8(c >> 16), uint8(c >> 8), uint8(c) }
func (c Color) T() uint8             { return uint8((c >> 24) & 0x7f) }
func (c Color) A() uint8             { return 100 - c.T() }
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
func Shades(c Color) []Color {
	r, g, b := c.RGB()
	t := c.T()
	lighter := RGBT(r+25, g+25, b+25, t)
	darker := RGBT(r-25, g-25, b-25, t)
	d := c.Max() - 25
	outline := RGB(r-d, g-d, b-d)
	return []Color{lighter, c, darker, outline}
}
