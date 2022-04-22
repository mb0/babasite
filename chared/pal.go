package chared

/*
we want to make using color palettes easier, especially creating palettes from scratch for
existing images. for that to work we cannot solely rely on indexes or we need to used fixed
indexes for each color. either way we need a way to transform pictures from the old palettes
to the new.

it would be great to have stable color indexes, then we can switch palette and colors without
changing each picture grid. we would need to come up with good and general set of color names.

it would also be great if we can somehow restrict ourselfs to 256 colors so we can change the
default grid tile to uint8. however we should consider the map editor and later game map needs.

if we can accept to use no more than max 32 features with max 8 colors per combined asset we can
keep using the feature color groups.

*/

const (
	FeatBasic = iota << 3
	FeatFace
	FeatSkin
	FeatHair

	FeatHat
	FeatShirt
	FeatPants
	FeatShoes

	FeatMat1
	FeatMat2
	FeatMat3
	// 21 more features available …
)

// feature: first, first-light, first-dark, outline, second, second-light, second-dark, highlight
const (
	CodeFst = iota
	CodeFstLight
	CodeFstDark
	CodeOutline
	CodeSnd
	CodeSndLight
	CodeSndDark
	CodeHighlight
)

var Names = map[int][]string{
	FeatBasic: {"basic", "bg", "ol", "poi1", "poi2", "poi3", "poi4", "poi5", "poi6"},
	FeatFace:  {"face", "iris", "eye", "pupil", "tear", "lips", "teeth", "blush", "face-hl"},
	FeatSkin:  stdNames("skin"),
	FeatHair:  stdNames("hair"),

	FeatHat:   stdNames("hat"),
	FeatShirt: stdNames("shirt"),
	FeatPants: stdNames("pants"),
	FeatShoes: stdNames("shoes"),

	FeatMat1: stdNames("mat1"),
	FeatMat2: stdNames("mat2"),
	FeatMat3: stdNames("mat3"),
	// 21 more features available …
}

func PixelName(p Pixel) string {
	feat := Names[int(p>>3)]
	if c := int(1 + p&7); c < len(feat) {
		return feat[c]
	}
	return ""
}

func stdNames(feat string) []string {
	return []string{
		feat, feat, feat + "-light", feat + "-dark", feat + "-ol",
		feat + "-snd", feat + "-snd-light", feat + "-snd-dark", feat + "-hl",
	}
}
