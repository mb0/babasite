package chared

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

	"github.com/mb0/babasite/game/pix"
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
//		$pic_number:001
// $pal_name.json
//
// dafür ist es sinnvoll wenn alle namen ohne leer- oder sonderzeichen sind.
// einfachheitshalber können wir die ids weg lassen. umbennenen können wir
// als löschen und erstellen umsetzen oder gesondert behandeln.
// wir speichern außerdem die bilder sequenz getrennt von den bildern
// sodass wir gleiche bilder mehrmals benutzen können.

type FileStore struct {
	*pix.Sys
	path  string
	dirfs fs.FS
}

func NewFileStore(path string) *FileStore {
	return &FileStore{
		Sys:   pix.NewSys(),
		path:  path,
		dirfs: os.DirFS(path),
	}
}

type AssetInfo struct {
	Name string `json:"name"`
	Kind string `json:"kind"`
}

func (s *FileStore) AssetInfos() []AssetInfo {
	res := make([]AssetInfo, 0, len(s.Assets))
	for _, a := range s.Assets {
		res = append(res, AssetInfo{Name: a.Name, Kind: a.Kind})
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Name < res[j].Name
	})
	return res
}

func (s *FileStore) PalInfos() []pix.Palette {
	res := make([]pix.Palette, 0, len(s.Pals))
	for _, p := range s.Pals {
		res = append(res, *p)
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Name < res[j].Name
	})
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
	pal := DefaultPalette()
	s.Pals[pal.Name] = pal
	for _, f := range files {
		name := f.Name()
		if f.IsDir() {
			// parse as asset
			_, err := s.LoadAsset(name)
			if err != nil {
				if err != fs.ErrNotExist {
					log.Printf("error reading %s/%s: %v", s.path, name, err)
				}
				continue
			}
		} else if strings.HasSuffix(name, ".json") {
			// parse as palette
			_, err := s.LoadPal(name[:len(name)-5])
			if err != nil {
				log.Printf("error reading palette %s: %v", name, err)
				continue
			}
		}
	}
	return nil
}

func (s *FileStore) LoadPal(name string) (*pix.Palette, error) {
	pal, err := readPal(s.dirfs, fmt.Sprintf("%s.json", name))
	if err != nil {
		return nil, err
	}
	pal.Name = name
	s.Pals[name] = pal
	return pal, nil
}

func (s *FileStore) LoadAsset(name string) (*pix.Asset, error) {
	a, err := readAsset(s.dirfs, name)
	if err != nil {
		return nil, err
	}
	s.Assets[name] = a
	return a, nil
}

func (s *FileStore) SavePal(p *pix.Palette) error {
	path := filepath.Join(s.path, fmt.Sprintf("%s.json", p.Name))
	err := writePal(p, path)
	if err != nil {
		return err
	}
	s.Pals[p.Name] = p
	return nil
}

func (s *FileStore) DropPal(name string) error {
	if _, ok := s.Pals[name]; ok {
		delete(s.Pals, name)
		return os.RemoveAll(filepath.Join(s.path, fmt.Sprintf("%s.json", name)))
	}
	return fmt.Errorf("not found")
}

func (s *FileStore) SaveAssetInfo(a *pix.Asset) error { return s.saveAsset(a, false) }
func (s *FileStore) SaveAssetFull(a *pix.Asset) error { return s.saveAsset(a, true) }
func (s *FileStore) saveAsset(a *pix.Asset, full bool) error {
	dir := filepath.Join(s.path, a.Name)
	err := writeAsset(a, dir)
	if err != nil {
		return err
	}
	s.Assets[a.Name] = a
	if !full {
		return nil
	}
	for _, pic := range a.Pics {
		path := filepath.Join(s.path, a.Name, fmt.Sprintf("%03d", pic.ID))
		err = writeSel(pic.Pix, path)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *FileStore) DropAsset(name string) error {
	a := s.Assets[name]
	if a != nil {
		delete(s.Assets, name)
		return os.RemoveAll(filepath.Join(s.path, name))
	}
	return nil
}

func (s *FileStore) SavePic(a *pix.Asset, id pix.PicID) (pic *pix.Pic, err error) {
	if a == nil || a.Name == "" {
		return nil, fmt.Errorf("invalid asset %v", a)
	}
	if id <= 0 {
		pic = a.NewPic()
	} else {
		pic = a.Pics[id]
		if pic == nil {
			if id > a.Last {
				a.Last = id
			}
			pic = &pix.Pic{ID: id}
			a.Pics[id] = pic
		}
	}
	path := filepath.Join(s.path, a.Name, fmt.Sprintf("%03d", id))
	return pic, writeSel(pic.Pix, path)
}

func (s *FileStore) DropPic(a *pix.Asset, id pix.PicID) error {
	if a == nil || id <= 0 {
		return fmt.Errorf("invalid pic id %d", id)
	}
	for _, s := range a.Seq {
		for i, p := range s.IDs {
			if p == id {
				s.IDs[i] = 0
			}
		}
	}
	delete(a.Pics, id)
	path := filepath.Join(s.path, a.Name, fmt.Sprintf("%03d", id))
	return os.Remove(path)
}

func readPal(dir fs.FS, pat string) (*pix.Palette, error) {
	raw, err := fs.ReadFile(dir, pat)
	if err != nil {
		return nil, err
	}
	var p pix.Palette
	err = json.Unmarshal(raw, &p)
	return &p, err
}

func readAssetInfo(dir fs.FS, pat string) (m pix.AssetInfo, err error) {
	raw, err := fs.ReadFile(dir, path.Join(pat, "asset.json"))
	if err != nil {
		return m, err
	}
	err = json.Unmarshal(raw, &m)
	if err != nil {
		return m, err
	}
	if m.Kind == "" || m.W <= 0 || m.H <= 0 {
		return m, fmt.Errorf("unknown asset kind")
	}
	return m, nil
}

func readAsset(dir fs.FS, pat string) (*pix.Asset, error) {
	m, err := readAssetInfo(dir, pat)
	if err != nil {
		return nil, err
	}
	pics, max, err := readPics(dir, pat)
	if err != nil {
		return nil, err
	}
	m.Name = path.Base(pat)
	return &pix.Asset{AssetInfo: m, Pics: pics, Last: max}, nil
}

func readPics(dir fs.FS, apath string) (m map[pix.PicID]*pix.Pic, max pix.PicID, _ error) {
	files, err := fs.ReadDir(dir, apath)
	if err != nil {
		return nil, 0, err
	}
	m = make(map[pix.PicID]*pix.Pic)
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		name := f.Name()
		uid, err := strconv.ParseUint(name, 10, 32)
		if err != nil {
			continue
		}
		sel, err := readSel(dir, path.Join(apath, name))
		if err != nil {
			return nil, 0, err
		}
		id := pix.PicID(uid)
		if id > max {
			max = id
		}
		m[id] = &pix.Pic{ID: id, Pix: sel}
	}
	return m, max, nil
}

func readSel(dir fs.FS, path string) (sel pix.Pix, err error) {
	raw, err := fs.ReadFile(dir, path)
	if err != nil {
		return sel, err
	}
	err = sel.UnmarshalBinary(raw)
	return sel, err
}

func writePal(p *pix.Palette, path string) error {
	err := ensureDir(filepath.Dir(path))
	if err != nil {
		return err
	}
	raw, err := json.Marshal(p)
	if err != nil {
		return err
	}
	return os.WriteFile(path, raw, 0644)
}
func writeAsset(a *pix.Asset, path string) error {
	err := ensureDir(path)
	if err != nil {
		return err
	}
	raw, err := json.Marshal(a.AssetInfo)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(path, "asset.json"), raw, 0644)
}

func writeSel(sel pix.Pix, path string) error {
	b, _ := sel.MarshalBinary()
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
