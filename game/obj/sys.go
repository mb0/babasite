package obj

// Sys is the object system of a game world where the obj ids map into the list offset by one.
type Sys struct {
	Objs []*Obj
}

func (s *Sys) Obj(id ObjID) *Obj {
	if id < 1 || int(id) > len(s.Objs) {
		return nil
	}
	return s.Objs[id-1]
}

func (s *Sys) NewObj() *Obj {
	id := ObjID(len(s.Objs) + 1)
	res := &Obj{ID: id}
	s.Objs = append(s.Objs, res)
	return res
}

func (s *Sys) DelObj(id ObjID) {
	if id < 1 || int(id) > len(s.Objs) {
		return
	}
	s.Objs[id-1] = nil
}
