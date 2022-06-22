package wedit

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/mb0/babasite/chared"
	"github.com/mb0/babasite/game"
	"github.com/mb0/babasite/game/bolt"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/lvl"
	"github.com/mb0/babasite/game/pix"
	"github.com/mb0/babasite/maped"
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
	var worlds []*game.World
	var def *game.World
	mappath := filepath.Join(dir, "maped")
	_, err := os.Stat(mappath)
	if err == nil {
		maps := maped.NewFileStore(mappath)
		err = maps.LoadAll()
		if err != nil {
			return nil, err
		}
		var tstab lvl.TsetTable
		tsmap := make(map[string]ids.Tset)
		for _, ts := range maps.Sets {
			nts, _ := tstab.New()
			nts.Name = ts.Name
			nts.Infos = ts.Infos
			tsmap[ts.Name] = nts.ID
		}
		for _, tm := range maps.Maps {
			var w game.World
			w.Name = tm.Name
			w.Vers.Mod = time.Now().Unix()
			w.Lvl.Tset = tstab
			for _, l := range tm.Levels {
				ng, _ := w.Lvl.Grid.New()
				ng.Tiles = l.Tiles
				nl, _ := w.Lvl.Lvl.New()
				nl.Name = l.Name
				nl.Dim = tm.Dim
				nl.Tset = tsmap[tm.WorldInfo.Tileset]
				nl.Grid = ng.ID
			}
			if def == nil || len(w.Lvl.Lvl.List) > len(def.Lvl.Lvl.List) {
				def = &w
			}
			worlds = append(worlds, &w)
		}
	}
	charpath := filepath.Join(dir, "chared")
	_, err = os.Stat(charpath)
	if err == nil {
		chars := chared.NewFileStore(charpath)
		err = chars.LoadAll()
		if err != nil {
			return nil, err
		}
		if def == nil {
			def = &game.World{}
			def.Name = "default"
			worlds = append(worlds, def)
		}
		palmap := make(map[string]ids.Pal)
		for _, pal := range chars.Pals {
			np, _ := def.Pix.Pal.New()
			np.Name = pal.Name
			np.Feats = pal.Feats
			palmap[pal.Name] = np.ID
		}
		for _, ass := range chars.Assets {
			ni, _ := def.Pix.Img.New()
			ni.Name = ass.Name
			ni.Kind = ass.Kind
			ni.Dim = ass.Dim
			ni.Pal = palmap[ass.AssetInfo.Pal]
			picmap := make(map[ids.Pic]ids.Pic)
			for pid, p := range ass.Pics {
				np, _ := def.Pix.Pic.New()
				np.Pix = p.Pix
				picmap[pid] = np.ID
			}
			for _, seq := range ass.Seq {
				nc, _ := def.Pix.Clip.New()
				nc.Name = seq.Name
				nc.Dim = ni.Dim
				nc.Img = ni.ID
				for _, id := range seq.IDs {
					nc.Seq = append(nc.Seq, pix.Frame{Pic: picmap[id]})
				}
			}
		}
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
