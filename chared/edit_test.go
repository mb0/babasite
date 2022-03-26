package chared

import (
	"reflect"
	"testing"
)

func TestCopySel(t *testing.T) {
	tests := []struct {
		name string
		pic  Pic
		sel  Sel
		want []int16
	}{
		{"fill copy", Pic{Size{3, 3}, make([]int16, 9)}, Sel{
			Size: Size{W: 3, H: 3},
			Data: []int16{1, 1, 1, 1, 1, 1, 1, 1, 1},
		}, []int16{
			1, 1, 1,
			1, 1, 1,
			1, 1, 1,
		}},
		{"fill part", Pic{Size{3, 3}, make([]int16, 9)}, Sel{
			Pos:  Pos{X: 1, Y: 1},
			Size: Size{W: 2, H: 2},
			Data: []int16{1, 2, 3, 4},
		}, []int16{
			0, 0, 0,
			0, 1, 2,
			0, 3, 4,
		}},
		{"dot end", Pic{Size{3, 3}, make([]int16, 9)}, Sel{
			Pos:  Pos{X: 1, Y: 2},
			Size: Size{W: 1, H: 1},
			Data: []int16{1},
		}, []int16{
			0, 0, 0,
			0, 0, 0,
			0, 1, 0,
		}},
	}
	for _, test := range tests {
		CopySel(&test.pic, test.sel)
		if !reflect.DeepEqual(test.pic.Data, test.want) {
			t.Errorf("failed test %s\n%v", test.name, test.pic.Data)
		}
	}
}
