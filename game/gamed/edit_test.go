package gamed

import (
	"reflect"
	"testing"

	"github.com/mb0/babasite/game/grid"
	"github.com/mb0/babasite/game/pix"
)

func TestCopySel(t *testing.T) {
	tests := []struct {
		name string
		pic  pix.Pix
		sel  pix.Pix
		want []uint16
	}{
		{"fill copy", pix.MakePix(0, 0, 3, 3), pix.MakePix(0, 0, 3, 3,
			1, 1, 1, 1, 1, 1, 1, 1, 1),
			[]uint16{
				1, 1, 1,
				1, 1, 1,
				1, 1, 1,
			}},
		{"fill part", pix.MakePix(0, 0, 3, 3), pix.MakePix(1, 1, 2, 2,
			1, 2, 3, 4),
			[]uint16{
				0, 0, 0,
				0, 1, 2,
				0, 3, 4,
			}},
		{"dot end", pix.MakePix(0, 0, 3, 3), pix.MakePix(1, 2, 1, 1, 1),
			[]uint16{
				0, 0, 0,
				0, 0, 0,
				0, 1, 0,
			}},
	}
	for _, test := range tests {
		grid.Each[pix.Pixel](&test.sel, test.pic.Set)
		if !reflect.DeepEqual(test.pic.Raw, test.want) {
			t.Errorf("failed test %s\n%v", test.name, test.pic.Raw)
		}
	}
}
