package chared

import (
	"archive/zip"
	"io"
	"io/fs"
	"path"
	"strconv"
	"strings"
	"time"
)

func Export(dirfs fs.FS, zw *zip.Writer) error {
	root := "chared"
	files, err := fs.ReadDir(dirfs, root)
	if err != nil {
		return err
	}
	copyReader := func(rel string, src io.Reader, mod time.Time) error {
		dst, err := zw.CreateHeader(&zip.FileHeader{
			Name:     rel,
			Method:   zip.Deflate,
			Modified: mod,
		})
		if err != nil {
			return err
		}
		_, err = io.Copy(dst, src)
		return err
	}
	copyFile := func(rel string) error {
		src, err := dirfs.Open(rel)
		if err != nil {
			return err
		}
		defer src.Close()
		stat, err := src.Stat()
		if err != nil {
			return err
		}
		return copyReader(rel, src, stat.ModTime())
	}
	exportAsset := func(name string) error {
		drel := path.Join(root, name)
		arel := path.Join(drel, "asset.json")
		src, err := dirfs.Open(arel)
		if err != nil {
			return err
		}
		defer src.Close()
		stat, err := src.Stat()
		if err != nil {
			return err
		}
		err = copyReader(arel, src, stat.ModTime())
		if err != nil {
			return err
		}
		files, err := fs.ReadDir(dirfs, drel)
		for _, pf := range files {
			if pf.IsDir() {
				continue
			}
			pname := pf.Name()
			_, err := strconv.ParseUint(pname, 10, 32)
			if err != nil {
				continue
			}
			err = copyFile(path.Join(drel, pname))
			if err != nil {
				return err
			}
		}
		return nil
	}
	for _, f := range files {
		name := f.Name()
		if f.IsDir() {
			// export asset
			err := exportAsset(name)
			if err != nil && err != fs.ErrNotExist {
				return err
			}
		} else if strings.HasSuffix(name, ".json") {
			// TODO maybe check if it really is a palette file
			// export palette
			err := copyFile(path.Join(root, name))
			if err != nil {
				return err
			}
		}
	}
	return nil
}
