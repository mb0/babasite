package bolt

import "github.com/mb0/babasite/game/pix"

func PixSync(s *pix.Sys) Sync {
	return Syncs{
		NewListSync(&s.Pal),
		NewListSync(&s.Img),
		NewListSync(&s.Clip),
		NewListSync(&s.Pic),
	}
}
