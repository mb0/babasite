package wedit

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/mb0/babasite/game/bolt"
	"github.com/mb0/babasite/wedit/olded"
	"go.etcd.io/bbolt"
)

// we want to check for a bolt db first. then if we have not found one check for
// chared and map data to import.
func Load(dir string) (db *bbolt.DB, err error) {
	dbpath := filepath.Join(dir, "baba.db")
	if _, err := os.Stat(dbpath); os.IsNotExist(err) {
		db, err = Import(dbpath, dir)
		if err != nil {
			return nil, fmt.Errorf("failed sync import data: %v", err)
		}
		log.Printf("imported old maped and chared data")
		return db, nil
	}
	return bbolt.Open(dbpath, 0600, nil)
}

func Import(dbpath, dir string) (*bbolt.DB, error) {
	worlds, err := olded.Import(dir)
	if err != nil {
		return nil, err
	}
	db, err := bbolt.Open(dbpath, 0600, nil)
	if err != nil {
		return nil, err
	}
	for _, w := range worlds {
		ws := bolt.MakeWorldSync(w)
		err = db.Update(func(tx *bbolt.Tx) error {
			return ws.Save(tx)
		})
		if err != nil {
			db.Close()
			return nil, err
		}
	}
	db.Sync()
	return db, nil
}
