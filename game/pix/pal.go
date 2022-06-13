package pix

type Pal interface {
	Color(p Pixel) Color
}

type MapPal map[Pixel]Color

func (pal MapPal) Color(p Pixel) Color { return pal[p] }

type Palette struct {
	Name string     `json:"name"`
	Feat []*Feature `json:"feat"`
}

func (pal *Palette) Color(p Pixel) Color {
	f, c := int(p/100), int(p%100)
	if f < len(pal.Feat) {
		feat := pal.Feat[f]
		if c < len(feat.Colors) {
			return feat.Colors[c]
		}
	}
	return 0
}

func (pal *Palette) GetFeature(name string) *Feature {
	for _, f := range pal.Feat {
		if f.Name == name {
			return f
		}
	}
	return nil
}

type Feature struct {
	Name   string  `json:"name"`
	Colors []Color `json:"colors"`
}
