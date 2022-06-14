package ids

type ID interface {
	~uint32
	Topic() []byte
}

// IDs are consecutive positive numbers valid within a world sub system.
// The zero value does represent a null instance.
type (
	Level uint32

	Obj uint32

	Dia uint32

	Prod uint32
	Item uint32
	Inv  uint32
)

func (Level) Topic() []byte { return []byte("level") }
func (Obj) Topic() []byte   { return []byte("obj") }
func (Dia) Topic() []byte   { return []byte("dia") }
func (Prod) Topic() []byte  { return []byte("prod") }
func (Item) Topic() []byte  { return []byte("item") }
func (Inv) Topic() []byte   { return []byte("inv") }
