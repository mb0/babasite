package inv

import (
	"fmt"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
)

// Sys is the inventory system where the ids map into corresponding lists offset by one.
type Sys struct {
	Prods []*Prod
	Items []*Item
	Invs  []*Inv
}

func (s *Sys) Prod(id ProdID) *Prod {
	if id < 1 || int(id) > len(s.Prods) {
		return nil
	}
	return s.Prods[id-1]
}

func (s *Sys) Item(id ItemID) *Item {
	if id < 1 || int(id) > len(s.Items) {
		return nil
	}
	return s.Items[id-1]
}

func (s *Sys) Inv(id InvID) *Inv {
	if id < 1 || int(id) > len(s.Invs) {
		return nil
	}
	return s.Invs[id-1]
}

func (s *Sys) NewProd(name string) *Prod {
	id := ProdID(len(s.Prods) + 1)
	res := &Prod{ID: id, Name: name, Dim: geo.Dim{W: 1, H: 1}}
	s.Prods = append(s.Prods, res)
	return res
}

func (s *Sys) NewItem(prod *Prod) *Item {
	id := ItemID(len(s.Items) + 1)
	res := &Item{ID: id, Prod: prod.ID, Box: geo.Box{Dim: prod.Dim}}
	s.Items = append(s.Items, res)
	return res
}

func (s *Sys) NewInv(dim geo.Dim) *Inv {
	id := InvID(len(s.Invs) + 1)
	res := &Inv{ID: id, Dim: dim}
	s.Invs = append(s.Invs, res)
	return res
}

func (s *Sys) DelProd(id ProdID) {
	if id < 1 || int(id) > len(s.Prods) {
		return
	}
	for _, it := range s.Items {
		if it != nil && it.Prod == id {
			if inv := s.Inv(it.Inv); inv != nil {
				s.delItemFromInv(it, inv)
			}
			s.delItem(it)
		}
	}
	s.Prods[id-1] = nil
}

func (s *Sys) DelItem(id ItemID) {
	if id < 1 || int(id) > len(s.Items) {
		return
	}
	it := s.Items[id-1]
	if it != nil {
		if inv := s.Inv(it.Inv); inv != nil {
			s.delItemFromInv(it, inv)
		}
		s.delItem(it)
	}
}

func (s *Sys) DelInv(id InvID) {
	if id < 1 || int(id) > len(s.Invs) {
		return
	}
	inv := s.Invs[id-1]
	for _, it := range inv.Items {
		if it.Inv == id {
			s.delItem(it)
		}
	}
	s.Invs[id-1] = nil
}

func (s *Sys) Move(id ItemID, to InvID, pos *geo.Pos) error {
	it := s.Item(id)
	if it == nil {
		return fmt.Errorf("item not found")
	}
	// fetch the current inventory (might be nil)
	cur := s.Inv(it.Inv)
	// if to is 0 or the same use cur as target or fetch the target inventory
	nxt := cur
	if to != 0 && nxt.ID != to {
		nxt = s.Inv(to)
	}
	if nxt == nil {
		return fmt.Errorf("inv not found")
	}
	p, ok := s.checkPos(it, nxt, pos)
	if !ok {
		return fmt.Errorf("item does not fit")
	}
	if cur != nxt { // if we move the item to another inventory
		if !s.canNestInto(it, nxt) {
			return fmt.Errorf("cannot move container item into itself")
		}
		if cur != nil { // cur inv might be nil
			s.delItemFromInv(it, cur)
		}
		// update to the new inventory
		it.Inv = nxt.ID
		nxt.Items = append(nxt.Items, it)
	}
	it.Pos = p
	return nil
}

func (s *Sys) delItem(it *Item) {
	if it.Sub != 0 {
		s.DelInv(it.Sub)
	}
	s.Items[it.ID-1] = nil
}
func (s *Sys) delItemFromInv(it *Item, inv *Inv) {
	for idx, ot := range inv.Items {
		if ot.ID == it.ID {
			inv.Items = append(inv.Items[:idx], inv.Items[idx+1:]...)
			break
		}
	}
}

// canNestInto checks if it can be moved to inv. This fails for item sub inventories like a backpack
// that is moved into itself.
func (s *Sys) canNestInto(it *Item, inv *Inv) bool {
	// fail early if one of the arguments is nil or the item sub is the target itself
	if it == nil || inv == nil || it.Sub == inv.ID {
		return false
	}
	// it is safe to move the item into the target if the item does not have a sub inventory
	if it.Sub == 0 {
		return true
	}
	// otherwise move up the inv chain and look for the item
	for cur := inv; cur != nil && cur.Sub != nil; cur = s.Inv(cur.Sub.Inv) {
		if cur.Sub.ID == it.ID {
			return false
		}
	}
	return true
}

// checkPos checks whether an item fits into inventory, if pos is given we check if the item fits,
// if nil we find the top-left most pos that fits.
func (s *Sys) checkPos(it *Item, inv *Inv, pos *geo.Pos) (res geo.Pos, ok bool) {
	// check the inventory layout we just paint a grid selection with all other items
	var sel grid.Sel
	sel.Dim = inv.Dim
	sel.Raw = make([]uint16, (inv.W*inv.H+15)/16)
	for _, ot := range inv.Items {
		if ot.ID == it.ID { // skip item to move, for moving inside an inventory
			continue
		}
		if ot.W > 1 || ot.H > 1 {
			geo.Each(ot.Box, func(p geo.Pos) { sel.Set(p, true) })
		} else { // small items use only one place
			sel.Set(ot.Pos, true)
		}
	}
	if pos == nil { // no position try to fit anywhere
		// find a place that is not painted
		_, ok = grid.Find[bool](&sel, func(p geo.Pos, t bool) bool {
			if t { // ignore painted
				return false
			}
			// ignore if a large item is blocked
			if (it.W > 1 || it.H > 1) && geo.Find(geo.Box{Pos: p, Dim: it.Dim}, sel.Get) {
				return false
			} // else we already know that a small item fits
			res = p
			return true
		})
	} else { // we got a position so check if it fits
		res = *pos
		ok = !geo.Find(geo.Box{Pos: res, Dim: it.Dim}, sel.Get)

	}
	return res, ok
}
