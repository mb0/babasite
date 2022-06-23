package ids

import "fmt"

type Named[T any] interface {
	Dec[T]
	UID() uint32
	Named() string
}

func NamedFind[I ID, T any, D Named[T]](lt *ListTable[I, T, D], name string) D {
	return lt.Find(func(el D) bool {
		return el.Named() == name
	})
}
func NamedUnique[I ID, T any, D Named[T]](lt *ListTable[I, T, D], name string) error {
	if !NameCheck.MatchString(name) {
		return fmt.Errorf("name invalid")
	}
	if NamedFind(lt, name) != nil {
		return fmt.Errorf("name already exists")
	}
	return nil
}
