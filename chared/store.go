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

// in diesem moment speichern wir ganze assets inklusive aller bilder im json
// format bei jeder änderung in eine datei. diese dateien können sehr viele bilder
// haben, wodurch es nicht mehr praktisch ist ganze datei neu speichern.
//
// weil wir einzelne sequenz bilder bearbeiten, wollen wir diese vielleicht auch
// einzeln speichern. wir wollen dann bilder erst senden wenn der benutzer eine
// sequenz auswählt.
//
// wir können alle meta daten separat weiter als json datei speichern.
// ich schlage folgendes schema vor:
//
// $asset_name/
//		asset.json
//		$seq_name/
//			$pic_number:001
// $pal_name.json
//
// dafür ist es sinnvoll wenn alle namen ohne leer- oder sonderzeichen sind.
// einfachheitshalber können wir die ids weg lassen. umbennenen können wir
// als löschen und erstellen umsetzen oder gesondert behandeln.
//

type AssetFile struct {
	Asset
	Path string
}

type FileStore struct {
	path  string
	names map[string]*AssetFile
	maxID uint32
}

func NewFileStore(path string) *FileStore {
	return &FileStore{path: path, names: make(map[string]*AssetFile)}
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
		s.names[a.Name] = af
		res = append(res, &a)
		return nil
	})
	return res, err
}

func (s *FileStore) SaveAsset(a *Asset) error {
	af := s.names[a.Name]
	if af == nil {
		af = &AssetFile{Asset: *a}
		s.names[a.Name] = af
	} else {
		af.Asset = *a
	}
	if af.Path == "" {
		af.Path = fmt.Sprintf("./%s.json", a.Name)
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
func (s *FileStore) DropAsset(name string) error {
	af := s.names[name]
	if af != nil {
		return os.Remove(af.Path)
	}
	return nil
}
