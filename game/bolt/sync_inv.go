package bolt

import "github.com/mb0/babasite/game/inv"

func InvSync(s *inv.Sys) Sync {
	return Syncs{
		NewListSync(&s.Prod),
		NewListSync(&s.Item),
		NewListSync(&s.Inv),
	}
}
