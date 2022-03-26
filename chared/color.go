package chared

func DefaultPallette() Pallette {
	return Pallette{Name: "default", Colors: []uint32{
		0xffffff,
		0x000000,
		0xff0000,
		0x00ff00,
		0x0000ff,
	}}
}

func NewShades(colors ...uint32) Pallette {
	cs := make([]uint32, 0, 5*len(colors))
	for _, c := range colors {
		r := int16((c >> 16) & 0xff)
		g := int16((c >> 8) & 0xff)
		b := int16(c & 0xff)
		for i := int16(-2); i < 3; i++ {
			cs = append(cs, uint32(r+i)<<16|uint32(g+i)<<8|uint32(b+i))
		}
	}
	return Pallette{Colors: cs}
}
