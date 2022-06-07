package maped

import (
	"archive/zip"
	"io"
	"io/fs"
	"path"
	"strconv"
	"strings"
)

func Export(dirfs fs.FS, zw *zip.Writer) error {
	root := "maped"
	files, err := fs.ReadDir(dirfs, root)
	if err != nil {
		return err
	}
	copyReader := func(rel string, src io.Reader) error {
		dst, err := zw.Create(rel)
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
		return copyReader(rel, src)
	}
	exportMap := func(name string) error {
		drel := path.Join(root, name)
		arel := path.Join(drel, "tilemap.json")
		src, err := dirfs.Open(arel)
		if err != nil {
			return err
		}
		defer src.Close()
		err = copyReader(arel, src)
		if err != nil {
			return err
		}
		files, err := fs.ReadDir(dirfs, drel)
		for _, lf := range files {
			if lf.IsDir() {
				continue
			}
			lname := lf.Name()
			_, err := strconv.ParseUint(lname, 10, 32)
			if err != nil {
				continue
			}
			err = copyFile(path.Join(drel, lname))
			if err != nil {
				return err
			}
		}
		return nil
	}
	for _, f := range files {
		name := f.Name()
		if f.IsDir() {
			// export map
			err := exportMap(name)
			if err != nil && err != fs.ErrNotExist {
				return err
			}
		} else if strings.HasSuffix(name, ".json") {
			// TODO maybe check if it really is a tileset file
			// export tileset
			err := copyFile(path.Join(root, name))
			if err != nil {
				return err
			}
		}
	}
	return nil
}
