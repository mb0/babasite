package grid

import (
	"fmt"

	"github.com/mb0/babasite/game/geo"
)

type Data struct {
	geo.Box
	Raw []uint16 `json:"data"`
}

func (g *Data) B() geo.Box { return g.Box }

func (g *Data) Clear() {
	for i := range g.Raw {
		g.Raw[i] = 0
	}
}

func (g Data) Copy() Data {
	data := make([]uint16, len(g.Raw))
	copy(data, g.Raw)
	g.Raw = data
	return g
}

func (g *Data) MarshalBinary() ([]byte, error) {
	b := make([]byte, 0, 8+2*len(g.Raw))
	b = writeBox(b, g.Box)
	for _, t := range g.Raw {
		b = writeUint(b, uint16(t))
	}
	return b, nil
}

func (g *Data) UnmarshalBinary(b []byte) error {
	if len(b) < 8 {
		return fmt.Errorf("short grid")
	}
	g.Box = readBox(b)
	b = b[8:]
	g.Raw = make([]uint16, len(b)/2)
	for i := range g.Raw {
		g.Raw[i] = readUint(b[i*2:])
	}
	return nil
}

func readUint(b []byte) uint16            { return uint16(b[0])<<8 | uint16(b[1]) }
func writeUint(b []byte, d uint16) []byte { return append(b, byte(d>>8), byte(d)) }
func readInt(b []byte) int                { return int(int16(readUint(b))) }
func writeInt(b []byte, d int) []byte     { return writeUint(b, uint16(d)) }

func readPos(b []byte) geo.Pos { return geo.Pos{X: readInt(b), Y: readInt(b[2:])} }
func writePos(b []byte, p geo.Pos) []byte {
	b = writeInt(b, p.X)
	b = writeInt(b, p.Y)
	return b
}
func readDim(b []byte) geo.Dim { return geo.Dim{W: readInt(b), H: readInt(b[2:])} }
func writeDim(b []byte, d geo.Dim) []byte {
	b = writeInt(b, d.W)
	b = writeInt(b, d.H)
	return b
}
func readBox(b []byte) geo.Box { return geo.Box{Pos: readPos(b), Dim: readDim(b[4:])} }
func writeBox(b []byte, x geo.Box) []byte {
	b = writePos(b, x.Pos)
	b = writeDim(b, x.Dim)
	return b
}
