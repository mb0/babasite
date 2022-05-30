package site

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/securecookie"
	"github.com/tidwall/buntdb"
	"xelf.org/daql/ses"
)

func SetupSess(db *buntdb.DB, cookieName string, secure bool) (*ses.Manager, error) {
	codec, err := getCodec(db, cookieName)
	if err != nil {
		return nil, err
	}
	cookie := ses.DefaultCookie(cookieName, secure)
	store := &BuntSessStore{DB: db}
	return ses.NewManager(store, ses.Config{
		TokenReader: cookie,
		Codec:       []ses.TokenCodec{codec},
	}), nil
}

func IsUserSess(s *ses.Session) bool {
	return s != nil && s.Data != nil && s.User() != ""
}

func Authenticate(next http.Handler) http.Handler {
	return ses.Requirer{
		Next: next,
		Allow: func(w http.ResponseWriter, r *http.Request, s *ses.Session) bool {
			return IsUserSess(s)
		},
	}
}

type Sess struct {
	Token string `json:"token"`
	Name  string `json:"name"`
	Admin bool   `json:"admin,omitempty"`
}

func (s *Sess) ID() string   { return s.Token }
func (s *Sess) Tok() string  { return s.Token }
func (s *Sess) User() string { return s.Name }

type BuntSessStore struct {
	*buntdb.DB
}

func (s *BuntSessStore) New() (_ ses.Data, err error) {
	for i := 0; i < 3; i++ {
		key := securecookie.GenerateRandomKey(8)
		tok := hex.EncodeToString(key)
		_, err = s.Get(tok)
		if err == nil {
			continue
		}
		return &Sess{Token: tok}, nil
	}
	return nil, fmt.Errorf("could not generate new session: %v", err)
}
func (s *BuntSessStore) Get(td string) (ses.Data, error) {
	var res Sess
	err := s.View(func(tx *buntdb.Tx) error {
		raw, err := tx.Get("sess_" + td)
		if err != nil {
			return err
		}
		return json.Unmarshal([]byte(raw), &res)
	})
	if err != nil {
		return nil, err
	}
	return &res, nil
}
func (s *BuntSessStore) Save(d ses.Data, isnew bool) error {
	raw, err := json.Marshal(d)
	if err != nil {
		return err
	}
	return s.Update(func(tx *buntdb.Tx) error {
		_, _, err := tx.Set("sess_"+d.Tok(), string(raw), nil)
		return err
	})
}
func (s *BuntSessStore) Delete(td string) error {
	return s.Update(func(tx *buntdb.Tx) error {
		_, err := tx.Delete("sess_" + td)
		return err
	})
}

type SecureCodec struct {
	*securecookie.SecureCookie
	name string
}

func (c *SecureCodec) DecodeToken(tok string) (td string, err error) {
	err = c.Decode(c.name, tok, &td)
	return td, err
}
func (c *SecureCodec) EncodeToken(td string) (tok string, err error) {
	tok, err = c.Encode(c.name, td)
	if err != nil {
		log.Printf("failed to encode %s for %s: %v", td, c.name, err)
	}
	return tok, err
}

func getCodec(db *buntdb.DB, name string) (ses.TokenCodec, error) {
	hashKey := "_cookie_hash_key_" + name
	blockKey := "_cookie_block_key_" + name
	var hash, block []byte
	err := db.View(func(tx *buntdb.Tx) (err error) {
		hash, err = getHex(tx, hashKey, 32)
		if err != nil {
			return err
		}
		block, err = getHex(tx, blockKey, 32)
		return err
	})
	if err != nil {
		hash = securecookie.GenerateRandomKey(32)
		block = securecookie.GenerateRandomKey(32)
		err = db.Update(func(tx *buntdb.Tx) error {
			_, _, err := tx.Set(hashKey, hex.EncodeToString(hash), nil)
			if err != nil {
				return err
			}
			_, _, err = tx.Set(blockKey, hex.EncodeToString(block), nil)
			return err
		})
		if err != nil {
			return nil, err
		}
	}
	sec := securecookie.New(hash, block)
	return &SecureCodec{sec, name}, nil
}
func getHex(tx *buntdb.Tx, key string, bytes int) ([]byte, error) {
	v, err := tx.Get(key)
	if err != nil {
		return nil, err

	}
	raw, err := hex.DecodeString(v)
	if err != nil {
		return nil, err
	}
	if bytes != 0 && len(raw) != bytes {
		return nil, fmt.Errorf("short key %s want %d got %d", key, bytes, len(raw))
	}
	return raw, nil
}
