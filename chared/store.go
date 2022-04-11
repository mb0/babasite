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
	path   string
	dirfs  fs.FS
	assets map[string]*Asset
	pals   map[string]*Palette
}

func NewFileStore(path string) *FileStore {
	return &FileStore{path: path,
		dirfs:  os.DirFS(path),
		assets: make(map[string]*Asset),
		pals:   make(map[string]*Palette),
	}
}

type AssetInfo struct {
	Name string `json:"name"`
	Kind string `json:"kind"`
}

func (s *FileStore) AssetInfos() []AssetInfo {
	res := make([]AssetInfo, 0, len(s.assets))
	for _, a := range s.assets {
		res = append(res, AssetInfo{Name: a.Name, Kind: a.Kind})
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Name < res[j].Name
	})
	return res
}

func (s *FileStore) PalInfos() []Palette {
	res := make([]Palette, 0, len(s.pals))
	for _, p := range s.pals {
		res = append(res, *p)
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Name < res[j].Name
	})
	return res
}

func (s *FileStore) Pal(name string) *Palette {
	return s.pals[name]
}

func (s *FileStore) Asset(name string) *Asset {
	return s.assets[name]
}

func (s *FileStore) Pics(name string, ids ...int) ([]*Pic, error) {
	a := s.assets[name]
	if a == nil {
		return nil, fmt.Errorf("asset %s not found", name)
	}
	return a.GetPics(ids...), nil
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
	s.pals[pal.Name] = pal
	// on the first pass read only pallettes and save asset candidates for second pass
	var cand []string
	for _, f := range files {
		name := f.Name()
		if f.IsDir() {
			// save candidate for later
			cand = append(cand, name)
		} else if strings.HasSuffix(name, ".json") {
			// parse as pallette
			_, err := s.LoadPal(name[:len(name)-5])
			if err != nil {
				log.Printf("error reading palette %s: %v", name, err)
				continue
			}
		}
	}
	for _, name := range cand {
		// parse as asset with all pallettes available
		_, err := s.LoadAsset(name)
		if err != nil {
			if err != fs.ErrNotExist {
				log.Printf("error reading %s/%s: %v", s.path, name, err)
			}
			continue
		}
	}
	return nil
}

func (s *FileStore) LoadPal(name string) (*Palette, error) {
	pal, err := readPal(s.dirfs, fmt.Sprintf("%s.json", name))
	if err != nil {
		return nil, err
	}
	pal.Name = name
	s.pals[name] = pal
	return pal, nil
}

func (s *FileStore) LoadAsset(name string) (*Asset, error) {
	a, err := readAsset(s.dirfs, name)
	if err != nil {
		return nil, err
	}
	s.assets[name] = a
	return a, nil
}

func (s *FileStore) SavePal(p *Palette) error {
	path := filepath.Join(s.path, fmt.Sprintf("%s.json", p.Name))
	err := writePal(p, path)
	if err != nil {
		return err
	}
	s.pals[p.Name] = p
	return nil
}

func (s *FileStore) DropPal(name string) error {
	if _, ok := s.pals[name]; ok {
		delete(s.pals, name)
		return os.RemoveAll(filepath.Join(s.path, fmt.Sprintf("%s.json", name)))
	}
	return fmt.Errorf("not found")
}

func (s *FileStore) SaveAssetMeta(a *Asset) error { return s.saveAsset(a, false) }
func (s *FileStore) SaveAssetFull(a *Asset) error { return s.saveAsset(a, true) }
func (s *FileStore) saveAsset(a *Asset, full bool) error {
	dir := filepath.Join(s.path, a.Name)
	err := writeAsset(a, dir)
	if err != nil {
		return err
	}
	s.assets[a.Name] = a
	if !full {
		return nil
	}
	for _, pic := range a.Pics {
		path := filepath.Join(s.path, a.Name, fmt.Sprintf("%03d", pic.ID))
		err = writeSel(pic.Sel, path)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *FileStore) DropAsset(name string) error {
	a := s.assets[name]
	if a != nil {
		delete(s.assets, name)
		return os.RemoveAll(filepath.Join(s.path, name))
	}
	return nil
}

func (s *FileStore) SavePic(a *Asset, id int) (pic *Pic, err error) {
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
			pic = &Pic{ID: id}
			a.Pics[id] = pic
		}
	}
	path := filepath.Join(s.path, a.Name, fmt.Sprintf("%03d", id))
	return pic, writeSel(pic.Sel, path)
}

func (s *FileStore) DropPic(a *Asset, id int) error {
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

func readPal(dir fs.FS, pat string) (*Palette, error) {
	raw, err := fs.ReadFile(dir, pat)
	if err != nil {
		return nil, err
	}
	var p Palette
	err = json.Unmarshal(raw, &p)
	return &p, err
}

func readAssetMeta(dir fs.FS, pat string) (m AssetMeta, err error) {
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

func readAsset(dir fs.FS, pat string) (*Asset, error) {
	m, err := readAssetMeta(dir, pat)
	if err != nil {
		return nil, err
	}
	pics, max, err := readPics(dir, pat)
	if err != nil {
		return nil, err
	}
	m.Name = path.Base(pat)
	return &Asset{AssetMeta: m, Pics: pics, Last: max}, nil
}

func readPics(dir fs.FS, apath string) (map[int]*Pic, int, error) {
	files, err := fs.ReadDir(dir, apath)
	if err != nil {
		return nil, 0, err
	}
	m := make(map[int]*Pic)
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
		sel, err := readSel(dir, path.Join(apath, name))
		if err != nil {
			return nil, 0, err
		}
		id := int(uid)
		if id > max {
			max = id
		}
		m[id] = &Pic{ID: id, Sel: sel}
	}
	return m, max, nil
}

func readSel(dir fs.FS, path string) (sel Sel, err error) {
	raw, err := fs.ReadFile(dir, path)
	if err != nil {
		return sel, err
	}
	err = sel.UnmarshalBinary(raw)
	return sel, err
}

func writePal(p *Palette, path string) error {
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
func writeAsset(a *Asset, path string) error {
	err := ensureDir(path)
	if err != nil {
		return err
	}
	raw, err := json.Marshal(a.AssetMeta)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(path, "asset.json"), raw, 0644)
}

func writeSel(sel Sel, path string) error {
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
