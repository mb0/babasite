package gol

import "testing"

func TestStep(t *testing.T) {
	m := NewMap(3, 3)
	m.Click(1, 1)
	m.Click(1, 2)
	m.Click(2, 1)
	m.Click(2, 2)
	t.Logf("step0 map is %v", m.Tiles)
	//n2 := m.Neighbours(2, 2)
	//if n2 != 3 {
	//	t.Errorf("2,2 expect 3 neighbours got %d", n2)
	//}
	n := m.Neighbours(1, 1)
	if n != 3 {
		t.Errorf("1,1 expect 3 neighbours got %d", n)
	}
	// m.Step()
	// t.Logf("step1 map is %v", m.Tiles)
	// m.Step()
	// t.Logf("step2 map is %v", m.Tiles)
	// m.Step()
	// t.Logf("step3 map is %v", m.Tiles)
}
