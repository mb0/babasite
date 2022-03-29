package chared

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
)

type AssetFile struct {
	Asset
	Path string
}

type FileStore struct {
	path  string
	ids   map[uint32]*AssetFile
	names map[string]*AssetFile
	maxID uint32
}

func NewFileStore(path string) *FileStore {
	return &FileStore{path: path, ids: make(map[uint32]*AssetFile), names: make(map[string]*AssetFile)}
}

func (s *FileStore) LoadAll() (res []*Asset, err error) {
	_, err = os.Stat(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			err = os.MkdirAll(s.path, 0755)
		}
		return nil, err
	}
	dir := os.DirFS(s.path)
	fs.WalkDir(dir, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			log.Printf("error walking dir %s: %v", s.path, err)
			return err
		}
		if !strings.HasSuffix(path, ".json") {
			return nil
		}
		f, err := dir.Open(path)
		if err != nil {
			log.Printf("error reading asset file %s: %v", path, err)
			return nil
		}
		defer f.Close()
		dec := json.NewDecoder(f)
		var a Asset
		err = dec.Decode(&a)
		if err != nil {
			log.Printf("error decoding asset file %s: %v", path, err)
			return nil
		}
		af := &AssetFile{a, path}
		s.ids[a.ID] = af
		s.names[a.Name] = af
		res = append(res, &a)
		if a.ID > s.maxID {
			s.maxID = a.ID
		}
		return nil
	})
	return res, err
}

func (s *FileStore) SaveAsset(a *Asset) error {
	var af *AssetFile
	if a.ID == 0 {
		s.maxID++
		a.ID = s.maxID
		af = &AssetFile{Asset: *a}
		s.ids[a.ID] = af
		s.names[a.Name] = af
	} else {
		af = s.ids[a.ID]
		if af == nil {
			af = &AssetFile{Asset: *a}
			s.ids[a.ID] = af
			s.names[a.Name] = af
		} else {
			af.Asset = *a
		}
	}
	if af.Path == "" {
		af.Path = fmt.Sprintf("./%04x_%s.json", a.ID, a.Name)
	}
	fname := filepath.Join(s.path, af.Path)
	f, err := os.Create(fname)
	if err != nil {
		return err
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	err = enc.Encode(a)
	if err != nil {
		return err
	}
	return f.Sync()
}
func (s *FileStore) DropAsset(id uint32) error {
	af := s.ids[id]
	if af != nil {
		return os.Remove(af.Path)
	}
	return nil
}
