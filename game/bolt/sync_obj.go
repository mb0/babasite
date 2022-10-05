package bolt

import "github.com/mb0/babasite/game/obj"

func ObjSync(s *obj.Sys) Sync {
	return Syncs{
		NewListSync(&s.Info),
		NewListSync(&s.Obj),
	}
}
