package bolt

import "github.com/mb0/babasite/game/dia"

func DiaSync(s *dia.Sys) Sync {
	return Syncs{
		NewListSync(&s.Dia),
	}
}
