package bolt

import "github.com/mb0/babasite/game/pix"

type PixSync pix.Sys

func (s *PixSync) Load(tx Src) (err error) {
	if err = LoadTable(tx, &s.Pal); err != nil {
		return err
	}
	if err = LoadTable(tx, &s.Img); err != nil {
		return err
	}
	if err = LoadTable(tx, &s.Clip); err != nil {
		return err
	}
	if err = LoadTable(tx, &s.Pic); err != nil {
		return err
	}
	return nil
}

func (s *PixSync) Sync(tx Src) (err error) {
	if err = SyncTable(tx, &s.Pal); err != nil {
		return err
	}
	if err = SyncTable(tx, &s.Img); err != nil {
		return err
	}
	if err = SyncTable(tx, &s.Clip); err != nil {
		return err
	}
	if err = SyncTable(tx, &s.Pic); err != nil {
		return err
	}
	return nil
}

func (s *PixSync) Save(tx Src) (err error) {
	if err = SaveTable(tx, &s.Pal); err != nil {
		return err
	}
	if err = SaveTable(tx, &s.Img); err != nil {
		return err
	}
	if err = SaveTable(tx, &s.Clip); err != nil {
		return err
	}
	if err = SaveTable(tx, &s.Pic); err != nil {
		return err
	}
	return nil
}
