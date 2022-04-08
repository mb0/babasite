package chared

import (
	"reflect"
	"testing"
)

func TestCopySel(t *testing.T) {
	tests := []struct {
		name string
		pic  Sel
		sel  Sel
		want []uint16
	}{
		{"fill copy", MakeSel(0, 0, 3, 3), MakeSel(0, 0, 3, 3,
			1, 1, 1, 1, 1, 1, 1, 1, 1),
			[]uint16{
				1, 1, 1,
				1, 1, 1,
				1, 1, 1,
			}},
		{"fill part", MakeSel(0, 0, 3, 3), MakeSel(1, 1, 2, 2,
			1, 2, 3, 4),
			[]uint16{
				0, 0, 0,
				0, 1, 2,
				0, 3, 4,
			}},
		{"dot end", MakeSel(0, 0, 3, 3), MakeSel(1, 2, 1, 1, 1),
			[]uint16{
				0, 0, 0,
				0, 0, 0,
				0, 1, 0,
			}},
	}
	for _, test := range tests {
		test.pic.Draw(test.sel, true)
		if !reflect.DeepEqual(test.pic.Raw, test.want) {
			t.Errorf("failed test %s\n%v", test.name, test.pic.Raw)
		}
	}
}
