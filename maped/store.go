package maped

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

type FileStore struct {
	path  string
	dirfs fs.FS
	maps  map[string]*TileMap
	sets  map[string]*Tileset
}

func NewFileStore(path string) *FileStore {
	return &FileStore{path: path,
		dirfs: os.DirFS(path),
		maps:  make(map[string]*TileMap),
		sets:  make(map[string]*Tileset),
	}
}

func (s *FileStore) Tileset(name string) *Tileset {
	return s.sets[name]
}

func (s *FileStore) TileMap(name string) *TileMap {
	return s.maps[name]
}

func (s *FileStore) MapInfos() []MapInfo {
	res := make([]MapInfo, 0, len(s.maps))
	for _, m := range s.maps {
		res = append(res, m.MapInfo)
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Name < res[j].Name
	})
	return res
}

func (s *FileStore) Tilesets() []string {
	res := make([]string, 0, len(s.sets))
	for _, ts := range s.sets {
		res = append(res, ts.Name)
	}
	sort.Strings(res)
	return res
}

func (s *FileStore) LoadAll() error {
	err := ensureDir(s.path)
	if err != nil {
		return err
	}
	files, err := fs.ReadDir(s.dirfs, ".")
	if err != nil {
		return err
	}
	for _, f := range files {
		name := f.Name()
		if !f.IsDir() && strings.HasSuffix(name, ".json") {
			// parse as palette
			_, err := s.LoadTileset(name[:len(name)-5])
			if err != nil {
				log.Printf("error reading tileset %s: %v", name, err)
				continue
			}
		}
	}
	if ts := s.sets["default"]; ts == nil {
		def := DefaultTileset
		s.sets[def.Name] = &def
	}
	for _, f := range files {
		name := f.Name()
		if f.IsDir() {
			// parse as map
			_, err := s.LoadTileMap(name)
			if err != nil {
				if err != fs.ErrNotExist {
					log.Printf("error reading %s/%s: %v", s.path, name, err)
				}
				continue
			}
		}
	}
	return nil
}

func (s *FileStore) LoadTileset(name string) (*Tileset, error) {
	ts, err := readTileset(s.dirfs, fmt.Sprintf("%s.json", name))
	if err != nil {
		return nil, err
	}
	ts.Name = name
	s.sets[name] = ts
	return ts, nil
}

func (s *FileStore) LoadTileMap(name string) (*TileMap, error) {
	tm, err := readTileMapFull(s.dirfs, name)
	if err != nil {
		return nil, err
	}
	tm.Tileset = s.Tileset(tm.MapInfo.Tileset)
	s.maps[name] = tm
	return tm, nil
}

func (s *FileStore) SaveTileset(ts *Tileset) error {
	path := filepath.Join(s.path, fmt.Sprintf("%s.json", ts.Name))
	err := writeTileset(ts, path)
	if err != nil {
		return err
	}
	s.sets[ts.Name] = ts
	return nil
}

func (s *FileStore) DropTileset(name string) error {
	if _, ok := s.sets[name]; ok {
		delete(s.sets, name)
		return os.RemoveAll(filepath.Join(s.path, fmt.Sprintf("%s.json", name)))
	}
	return fmt.Errorf("not found")
}

func (s *FileStore) SaveTileMap(tm *TileMap) error {
	dir := filepath.Join(s.path, tm.Name)
	err := writeTileMap(tm, dir)
	if err != nil {
		return err
	}
	s.maps[tm.Name] = tm
	return nil
}

func (s *FileStore) DropTileMap(name string) error {
	a := s.maps[name]
	if a != nil {
		delete(s.maps, name)
		return os.RemoveAll(filepath.Join(s.path, name))
	}
	return nil
}

func (s *FileStore) SaveLevel(tm *TileMap, id int) (lvl *Level, err error) {
	if tm == nil || tm.Name == "" {
		return nil, fmt.Errorf("invalid level %v", tm)
	}
	if id <= 0 {
		lvl = tm.NewLevel()
	} else {
		lvl = tm.Levels[id]
		if lvl == nil {
			lvl = &Level{ID: id}
			tm.Levels[id] = lvl
		}
	}
	path := filepath.Join(s.path, tm.Name, fmt.Sprintf("%03d", id))
	return lvl, writeLevel(lvl, path)
}

func (s *FileStore) DropLevel(tm *TileMap, id int) error {
	if tm == nil || id <= 0 {
		return fmt.Errorf("invalid level id %d", id)
	}
	delete(tm.Levels, id)
	path := filepath.Join(s.path, tm.Name, fmt.Sprintf("%03d", id))
	return os.Remove(path)
}

func readTileset(dir fs.FS, pat string) (*Tileset, error) {
	raw, err := fs.ReadFile(dir, pat)
	if err != nil {
		return nil, err
	}
	var ts Tileset
	err = json.Unmarshal(raw, &ts)
	return &ts, err
}

func readMapInfo(dir fs.FS, pat string) (m MapInfo, err error) {
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

func readTileMapFull(dir fs.FS, pat string) (*TileMap, error) {
	info, err := readMapInfo(dir, pat)
	if err != nil {
		return nil, err
	}
	m := &TileMap{MapInfo: info}
	lvls, _, err := readLevels(dir, pat)
	if err != nil {
		return nil, err
	}
	m.Levels = lvls
	return m, nil
}

func readLevels(dir fs.FS, apath string) (map[int]*Level, int, error) {
	files, err := fs.ReadDir(dir, apath)
	if err != nil {
		return nil, 0, err
	}
	m := make(map[int]*Level)
	var max int
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		name := f.Name()
		uid, err := strconv.ParseUint(name, 10, 32)
		if err != nil {
			continue
		}
		lvl, err := readLevel(dir, path.Join(apath, name))
		if err != nil {
			return nil, 0, err
		}
		id := int(uid)
		if id > max {
			max = id
		}
		lvl.ID = id
		m[id] = lvl
	}
	return m, max, nil
}

func readLevel(dir fs.FS, path string) (lvl *Level, err error) {
	raw, err := fs.ReadFile(dir, path)
	if err != nil {
		return nil, err
	}
	lvl = &Level{}
	err = lvl.UnmarshalBinary(raw)
	return lvl, err
}

func writeTileset(ts *Tileset, path string) error {
	err := ensureDir(filepath.Dir(path))
	if err != nil {
		return err
	}
	raw, err := json.Marshal(ts)
	if err != nil {
		return err
	}
	return os.WriteFile(path, raw, 0644)
}
func writeTileMap(tm *TileMap, path string) error {
	err := ensureDir(path)
	if err != nil {
		return err
	}
	raw, err := json.Marshal(tm.MapInfo)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(path, "tilemap.json"), raw, 0644)
}

func writeLevel(lvl *Level, path string) error {
	b, _ := lvl.MarshalBinary()
	return os.WriteFile(path, b, 0644)
}

func ensureDir(path string) error {
	d, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return os.MkdirAll(path, 0755)
		}
		return err
	} else if !d.IsDir() {
		return fmt.Errorf("expect dir")
	}
	return nil
}
