package bolt

import "github.com/mb0/babasite/game/lvl"

func LvlSync(s *lvl.Sys) Sync {
	return Syncs{
		NewListSync(&s.Tset),
		NewListSync(&s.Lvl),
		NewListSync(&s.Grid),
	}
}
