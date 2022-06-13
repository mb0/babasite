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

	"github.com/mb0/babasite/game/lvl"
)

type FileStore struct {
	path  string
	dirfs fs.FS
	maps  map[string]*lvl.World
	sets  map[string]*lvl.Tileset
}

func NewFileStore(path string) *FileStore {
	return &FileStore{path: path,
		dirfs: os.DirFS(path),
		maps:  make(map[string]*lvl.World),
		sets:  make(map[string]*lvl.Tileset),
	}
}

func (s *FileStore) Tileset(name string) *lvl.Tileset {
	return s.sets[name]
}

func (s *FileStore) World(name string) *lvl.World {
	return s.maps[name]
}

func (s *FileStore) WorldInfos() []lvl.WorldInfo {
	res := make([]lvl.WorldInfo, 0, len(s.maps))
	for _, m := range s.maps {
		res = append(res, m.WorldInfo)
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
			// parse as world
			_, err := s.LoadWorld(name)
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

func (s *FileStore) LoadTileset(name string) (*lvl.Tileset, error) {
	ts, err := readTileset(s.dirfs, fmt.Sprintf("%s.json", name))
	if err != nil {
		return nil, err
	}
	ts.Name = name
	s.sets[name] = ts
	return ts, nil
}

func (s *FileStore) LoadWorld(name string) (*lvl.World, error) {
	w, err := readTileMapFull(s.dirfs, name)
	if err != nil {
		return nil, err
	}
	w.Tileset = s.Tileset(w.WorldInfo.Tileset)
	s.maps[name] = w
	return w, nil
}

func (s *FileStore) SaveTileset(ts *lvl.Tileset) error {
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

func (s *FileStore) SaveWorld(w *lvl.World) error {
	dir := filepath.Join(s.path, w.Name)
	err := writeTileMap(w, dir)
	if err != nil {
		return err
	}
	s.maps[w.Name] = w
	return nil
}

func (s *FileStore) DropWorld(name string) error {
	a := s.maps[name]
	if a != nil {
		delete(s.maps, name)
		return os.RemoveAll(filepath.Join(s.path, name))
	}
	return nil
}

func (s *FileStore) SaveLevel(w *lvl.World, id lvl.LevelID) (l *lvl.Level, err error) {
	if w == nil || w.Name == "" {
		return nil, fmt.Errorf("invalid level %v", w)
	}
	if id <= 0 {
		l = w.NewLevel()
	} else {
		l = w.Levels[id]
		if l == nil {
			l = &lvl.Level{}
			l.ID = id
			w.Levels[id] = l
		}
	}
	path := filepath.Join(s.path, w.Name, fmt.Sprintf("%03d", id))
	return l, writeLevel(l, path)
}

func (s *FileStore) DropLevel(w *lvl.World, id lvl.LevelID) error {
	if w == nil || id <= 0 {
		return fmt.Errorf("invalid level id %d", id)
	}
	delete(w.Levels, id)
	path := filepath.Join(s.path, w.Name, fmt.Sprintf("%03d", id))
	return os.Remove(path)
}

func readTileset(dir fs.FS, pat string) (*lvl.Tileset, error) {
	raw, err := fs.ReadFile(dir, pat)
	if err != nil {
		return nil, err
	}
	var ts lvl.Tileset
	err = json.Unmarshal(raw, &ts)
	return &ts, err
}

func readWorldInfo(dir fs.FS, pat string) (m lvl.WorldInfo, err error) {
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

func readTileMapFull(dir fs.FS, pat string) (*lvl.World, error) {
	info, err := readWorldInfo(dir, pat)
	if err != nil {
		return nil, err
	}
	m := &lvl.World{WorldInfo: info}
	lvls, _, err := readLevels(dir, pat)
	if err != nil {
		return nil, err
	}
	m.Levels = lvls
	return m, nil
}

func readLevels(dir fs.FS, apath string) (map[lvl.LevelID]*lvl.Level, lvl.LevelID, error) {
	files, err := fs.ReadDir(dir, apath)
	if err != nil {
		return nil, 0, err
	}
	m := make(map[lvl.LevelID]*lvl.Level)
	var max lvl.LevelID
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
		id := lvl.LevelID(uid)
		if id > max {
			max = id
		}
		lv.ID = id
		m[id] = lv
	}
	return m, max, nil
}

func readLevel(dir fs.FS, path string) (l *lvl.Level, err error) {
	raw, err := fs.ReadFile(dir, path)
	if err != nil {
		return nil, err
	}
	l = &lvl.Level{}
	err = l.UnmarshalBinary(raw)
	return l, err
}

func writeTileset(ts *lvl.Tileset, path string) error {
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
func writeTileMap(tm *lvl.World, path string) error {
	err := ensureDir(path)
	if err != nil {
		return err
	}
	raw, err := json.Marshal(tm.WorldInfo)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(path, "tilemap.json"), raw, 0644)
}

func writeLevel(lvl *lvl.Level, path string) error {
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
