package inv

import (
	"fmt"

	"github.com/mb0/babasite/game/geo"
	"github.com/mb0/babasite/game/grid"
	"github.com/mb0/babasite/game/ids"
)

type ProdTable = ids.ListTable[ids.Prod, Prod, *Prod]
type ItemTable = ids.ListTable[ids.Item, Item, *Item]
type InvTable = ids.ListTable[ids.Inv, Inv, *Inv]

// Sys is the inventory system where the ids map into corresponding lists offset by one.
type Sys struct {
	Prod ProdTable
	Item ItemTable
	Inv  InvTable
}

func (s *Sys) NewProd(name string) (*Prod, error) {
	p, err := s.Prod.New()
	if err != nil {
		return nil, err
	}
	p.Name = name
	p.Dim = geo.Dim{W: 1, H: 1}
	return p, nil
}

func (s *Sys) NewItem(prod *Prod) (*Item, error) {
	it, err := s.Item.New()
	if err != nil {
		return nil, err
	}
	it.Prod = prod.ID
	it.Dim = prod.Dim
	return it, nil
}

func (s *Sys) NewInv(dim geo.Dim) (*Inv, error) {
	inv, err := s.Inv.New()
	if err != nil {
		return nil, err
	}
	inv.Dim = dim
	return inv, nil
}

func (s *Sys) DelProd(id ids.Prod) {
	p, _ := s.Prod.Get(id)
	if p == nil {
		return
	}
	for _, sl := range s.Item.List {
		if it := sl.Data; it != nil && it.Prod == id {
			if inv, _ := s.Inv.Get(it.Inv); inv != nil {
				s.delItemFromInv(it, inv)
			}
			s.delItem(it)
		}
	}
	s.Prod.Set(id, nil)
}

func (s *Sys) DelItem(id ids.Item) {
	it, _ := s.Item.Get(id)
	if it != nil {
		if inv, _ := s.Inv.Get(it.Inv); inv != nil {
			s.delItemFromInv(it, inv)
		}
		s.delItem(it)
	}
}

func (s *Sys) DelInv(id ids.Inv) {
	inv, _ := s.Inv.Get(id)
	if inv != nil {
		for _, it := range inv.Items {
			s.delItem(it)
		}
		s.Inv.Set(id, nil)
	}
}

func (s *Sys) Move(id ids.Item, to ids.Inv, pos *geo.Pos) error {
	it, err := s.Item.Get(id)
	if err != nil {
		return err
	}
	// fetch the current inventory (might be nil)
	var cur *Inv
	if it.Inv != 0 {
		cur, err = s.Inv.Get(it.Inv)
		if err != nil {
			return err
		}
	}
	// if to is 0 or the same use cur as target or fetch the target inventory
	nxt := cur
	if to != 0 && nxt.ID != to {
		nxt, err = s.Inv.Get(to)
		if err != nil {
			return err
		}
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
	s.Item.Set(it.ID, nil)
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
	for cur := inv; cur != nil && cur.Sub != nil; {
		if cur.Sub.ID == it.ID {
			return false
		}
		if cur.Sub.Inv == 0 {
			return true
		}
		nxt, err := s.Inv.Get(cur.Sub.Inv)
		if err != nil {
			return false
		}
		cur = nxt
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
