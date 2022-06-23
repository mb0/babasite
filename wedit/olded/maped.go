package olded

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path"
	"strconv"
	"strings"

	"github.com/mb0/babasite/game/ids"
)

func (s *store) loadMaps(path string) error {
	err := ensureDir(path)
	if err != nil {
		return err
	}
	dirfs := os.DirFS(path)
	files, err := fs.ReadDir(dirfs, ".")
	if err != nil {
		return err
	}
	for _, f := range files {
		name := f.Name()
		if !f.IsDir() && strings.HasSuffix(name, ".json") {
			// parse as palette
			_, err := s.loadTset(dirfs, name[:len(name)-5])
			if err != nil {
				log.Printf("error reading tileset %s: %v", name, err)
				continue
			}
		}
	}
	if ts := s.Sets["default"]; ts == nil {
		s.Sets["default"] = &Tset{Name: "default", Infos: []TileInfo{
			{Tile: 0, Name: "void", Color: 0xffffff, Block: true, Group: "basic"},
			{Tile: 1, Name: "wall", Color: 0x888888, Block: true, Group: "basic"},
		}}
	}
	for _, f := range files {
		name := f.Name()
		if f.IsDir() {
			// parse as world
			_, err := s.loadWorld(dirfs, name)
			if err != nil {
				if err != fs.ErrNotExist {
					log.Printf("error reading %s/%s: %v", path, name, err)
				}
				continue
			}
		}
	}
	return nil
}

func (s *store) loadTset(fs fs.FS, name string) (*Tset, error) {
	ts, err := readTileset(fs, fmt.Sprintf("%s.json", name))
	if err != nil {
		return nil, err
	}
	ts.Name = name
	s.Sets[name] = ts
	return ts, nil
}

func (s *store) loadWorld(fs fs.FS, name string) (*World, error) {
	w, err := readTileMapFull(fs, name)
	if err != nil {
		return nil, err
	}
	w.Tileset = s.Sets[w.WorldInfo.Tileset]
	s.Maps[name] = w
	return w, nil
}

func readTileset(dir fs.FS, pat string) (*Tset, error) {
	raw, err := fs.ReadFile(dir, pat)
	if err != nil {
		return nil, err
	}
	var ts Tset
	err = json.Unmarshal(raw, &ts)
	return &ts, err
}

func readWorldInfo(dir fs.FS, pat string) (m WorldInfo, err error) {
	raw, err := fs.ReadFile(dir, path.Join(pat, "tilemap.json"))
	if err != nil {
		return m, err
	}
	err = json.Unmarshal(raw, &m)
	if err != nil {
		return m, err
	}
	if m.W <= 0 || m.H <= 0 {
		return m, fmt.Errorf("unknown map size")
	}
	m.Name = path.Base(pat)
	return m, nil
}

func readTileMapFull(dir fs.FS, pat string) (*World, error) {
	info, err := readWorldInfo(dir, pat)
	if err != nil {
		return nil, err
	}
	m := &World{WorldInfo: info}
	lvls, _, err := readLevels(dir, pat)
	if err != nil {
		return nil, err
	}
	m.Levels = lvls
	return m, nil
}

func readLevels(dir fs.FS, apath string) (map[ids.Lvl]*Level, ids.Lvl, error) {
	files, err := fs.ReadDir(dir, apath)
	if err != nil {
		return nil, 0, err
	}
	m := make(map[ids.Lvl]*Level)
	var max ids.Lvl
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		name := f.Name()
		uid, err := strconv.ParseUint(name, 10, 32)
		if err != nil {
			continue
		}
		lv, err := readLevel(dir, path.Join(apath, name))
		if err != nil {
			return nil, 0, err
		}
		id := ids.Lvl(uid)
		if id > max {
			max = id
		}
		lv.ID = id
		m[id] = lv
	}
	return m, max, nil
}

func readLevel(dir fs.FS, path string) (l *Level, err error) {
	raw, err := fs.ReadFile(dir, path)
	if err != nil {
		return nil, err
	}
	l = &Level{}
	err = l.UnmarshalBinary(raw)
	return l, err
}
