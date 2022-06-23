package olded

import (
	"errors"
	"os"
	"path/filepath"
	"time"

	"github.com/mb0/babasite/game"
	"github.com/mb0/babasite/game/ids"
	"github.com/mb0/babasite/game/lvl"
	"github.com/mb0/babasite/game/pix"
)

type store struct {
	Maps   map[string]*World
	Sets   map[string]*Tset
	Assets map[string]*Asset
	Pals   map[string]*Pal
}

func Import(dir string) (res []*game.World, err error) {
	fs := &store{
		Maps:   make(map[string]*World),
		Sets:   make(map[string]*Tset),
		Assets: make(map[string]*Asset),
		Pals:   make(map[string]*Pal),
	}
	err = fs.loadMaps(filepath.Join(dir, "maped"))
	if err != nil {
		return nil, err
	}
	err = fs.loadAssets(filepath.Join(dir, "chared"))
	if err != nil {
		if !errors.Is(os.ErrNotExist, err) {
			return nil, err
		}
	}
	var def *game.World
	var tstab lvl.TsetTable
	tsmap := make(map[string]ids.Tset)
	for _, ts := range fs.Sets {
		nts, _ := tstab.New()
		nts.Name = ts.Name
		for _, old := range ts.Infos {
			nts.Infos = append(nts.Infos, lvl.TileInfo(old))
		}
		tsmap[ts.Name] = nts.ID
	}
	for _, tm := range fs.Maps {
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
		res = append(res, &w)
	}
	if len(fs.Pals) == 0 {
		return res, nil
	}
	if def == nil {
		def = &game.World{}
		def.Name = "default"
		res = append(res, def)
	}
	palmap := make(map[string]ids.Pal)
	for _, pal := range fs.Pals {
		np, _ := def.Pix.Pal.New()
		np.Name = pal.Name
		for _, old := range pal.Feats {
			f := &pix.Feat{Name: old.Name}
			for _, oldc := range old.Colors {
				f.Colors = append(f.Colors, pix.Color(oldc))
			}
			np.Feats = append(np.Feats, f)
		}
		palmap[pal.Name] = np.ID
	}
	for _, ass := range fs.Assets {
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
	return res, nil
}
