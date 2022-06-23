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
	"github.com/mb0/babasite/game/pix"
)

func (s *store) loadAssets(path string) error {
	err := ensureDir(path)
	if err != nil {
		return err
	}
	dirfs := os.DirFS(path)
	files, err := fs.ReadDir(dirfs, ".")
	if err != nil {
		return err
	}
	pal := &Pal{Name: "default", Feats: []*Feat{
		{Name: "basic", Colors: []Color{0xffffff, 0x000000}},
		{Name: "skin", Colors: []Color{0xffcbb8, 0xfca99a, 0xc58e81, 0x190605}},
		{Name: "eyes", Colors: []Color{0xfffff0, 0x1a5779, 0x110100}},
		{Name: "hair", Colors: []Color{0xf1ba60, 0xc47e31, 0x604523, 0x090100}},
		{Name: "shirt", Colors: []Color{0xa9cc86, 0x6e8e52, 0x51683b, 0x040000}},
		{Name: "pants", Colors: []Color{0x484a49, 0x303030, 0x282224, 0x170406}},
		{Name: "shoes", Colors: []Color{0xb16f4b, 0x82503e, 0x3f1f15, 0x030000}},
	}}
	s.Pals[pal.Name] = pal
	for _, f := range files {
		name := f.Name()
		if f.IsDir() {
			// parse as asset
			_, err := s.loadAsset(dirfs, name)
			if err != nil {
				if err != fs.ErrNotExist {
					log.Printf("error reading %s/%s: %v", path, name, err)
				}
				continue
			}
		} else if strings.HasSuffix(name, ".json") {
			// parse as palette
			_, err := s.loadPal(dirfs, name[:len(name)-5])
			if err != nil {
				log.Printf("error reading palette %s: %v", name, err)
				continue
			}
		}
	}
	return nil
}

func (s *store) loadPal(fs fs.FS, name string) (*Pal, error) {
	pal, err := readPal(fs, fmt.Sprintf("%s.json", name))
	if err != nil {
		return nil, err
	}
	pal.Name = name
	s.Pals[name] = pal
	return pal, nil
}

func (s *store) loadAsset(fs fs.FS, name string) (*Asset, error) {
	a, err := readAsset(fs, name)
	if err != nil {
		return nil, err
	}
	s.Assets[name] = a
	return a, nil
}

func readPal(dir fs.FS, pat string) (*Pal, error) {
	raw, err := fs.ReadFile(dir, pat)
	if err != nil {
		return nil, err
	}
	var p Pal
	err = json.Unmarshal(raw, &p)
	return &p, err
}

func readAssetInfo(dir fs.FS, pat string) (m AssetInfo, err error) {
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
	m, err := readAssetInfo(dir, pat)
	if err != nil {
		return nil, err
	}
	pics, max, err := readPics(dir, pat)
	if err != nil {
		return nil, err
	}
	m.Name = path.Base(pat)
	return &Asset{AssetInfo: m, Pics: pics, Last: max}, nil
}

func readPics(dir fs.FS, apath string) (m map[ids.Pic]*Pic, max ids.Pic, _ error) {
	files, err := fs.ReadDir(dir, apath)
	if err != nil {
		return nil, 0, err
	}
	m = make(map[ids.Pic]*Pic)
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
		id := ids.Pic(uid)
		if id > max {
			max = id
		}
		m[id] = &Pic{ID: id, Pix: sel}
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
