package chared

import "fmt"

type EditPic struct {
	Seq  string `json:"seq"`
	Pic  int    `json:"pic"`
	Copy bool   `json:"copy,omitempty"`
	Sel
}

type Sel struct {
	Pos
	Size
	Data []Pixel `json:"data"`
}

type Pos struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// Apply changes asset a with the given edit or returns an error.
func Apply(a *Asset, e EditPic) error {
	// TODO validate edit
	if !a.ValidSel(e.Sel) {
		return fmt.Errorf("edit selection invalid")
	}
	// first look up the pic to edit
	pic := a.GetPic(e.Seq, e.Pic)
	if pic == nil {
		return fmt.Errorf("no sequence named %s", e.Seq)
	}
	if e.Copy {
		CopySel(pic, e.Sel)
	} else {
		DrawSel(pic, e.Sel)
	}
	return nil
}

func CopySel(pic *Pic, e Sel) {
	// check whether this is a full image edit
	if len(pic.Data) == len(e.Data) {
		// same length, we can copy the whole list
		copy(pic.Data, e.Data)
	} else {
		// we edit a pic subset the row segments
		h := e.Y + e.H
		for y := e.Y; y < h; y++ {
			di := (y - e.Y) * e.W
			copy(pic.Data[y*pic.W+e.X:], e.Data[di:di+e.W])
		}
	}
}

func DrawSel(pic *Pic, e Sel) {
	for ey := 0; ey < e.H; ey++ {
		row := (e.Y + ey) * pic.W
		for ex := 0; ex < e.W; ex++ {
			v := e.Data[ey*e.W+ex]
			if v != 0 {
				pic.Data[row+e.X+ex] = v
			}
		}
	}
}
