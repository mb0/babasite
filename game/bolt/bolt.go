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

type Syncs []Sync

func (ss Syncs) Load(tx Src) error {
	for _, s := range ss {
		if err := s.Load(tx); err != nil {
			return fmt.Errorf("sync %T: %v", s, err)
		}
	}
	return nil
}

func (ss Syncs) Dirty() bool {
	for _, s := range ss {
		if s.Dirty() {
			return true
		}
	}
	return false
}

func (ss Syncs) Sync(tx Src) error {
	for _, sub := range ss {
		if sub.Dirty() {
			if err := sub.Sync(tx); err != nil {
				return err
			}
		}
	}
	return nil
}

func (ss Syncs) Save(tx Src) error {
	for _, s := range ss {
		if err := s.Save(tx); err != nil {
			return err
		}
	}
	return nil
}
