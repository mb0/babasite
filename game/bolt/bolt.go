// Packages bolt provides ways to store and query game data in the bbolt database.
package bolt

import (
	"encoding/binary"
	"encoding/hex"
	"fmt"

	"go.etcd.io/bbolt"
)

var ErrShort = fmt.Errorf("short id data")

func ReadID(raw []byte) (uint32, error) {
	if len(raw) != 8 {
		return 0, ErrShort
	}
	dst := make([]byte, 4)
	_, err := hex.Decode(dst, raw)
	if err != nil {
		return 0, err
	}
	return binary.BigEndian.Uint32(dst), nil
}

func WriteID(id uint32) []byte {
	res := make([]byte, 8)
	binary.BigEndian.PutUint32(res[4:], id)
	hex.Encode(res, res[4:])
	return res
}

type Src interface {
	Bucket([]byte) *bbolt.Bucket
	CreateBucket([]byte) (*bbolt.Bucket, error)
	DeleteBucket([]byte) error
	CreateBucketIfNotExists([]byte) (*bbolt.Bucket, error)
	Cursor() *bbolt.Cursor
}

type Sync interface {
	Load(Src) error
	Dirty() bool
	Sync(Src) error
	Save(Src) error
}
