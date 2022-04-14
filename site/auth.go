package site

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"time"

	"github.com/tidwall/buntdb"
	"golang.org/x/crypto/bcrypt"
	"xelf.org/daql/ses"
)

type UserData struct {
	Name    string
	Pass    string
	Admin   bool
	Created time.Time
	Last    time.Time
}

type BuntUserStore struct {
	*buntdb.DB
}

func (s *BuntUserStore) Get(name string) (res UserData, err error) {
	err = s.View(func(tx *buntdb.Tx) error {
		raw, err := tx.Get("user_" + name)
		if err != nil {
			return err
		}
		return json.Unmarshal([]byte(raw), &res)
	})
	return res, err
}
func (s *BuntUserStore) Save(data UserData) error {
	cost, err := bcrypt.Cost([]byte(data.Pass))
	if err == nil && cost < bcrypt.MinCost {
		return bcrypt.InvalidCostError(cost)
	} else if err != nil {
		if err != bcrypt.ErrHashTooShort {
			return fmt.Errorf("unexpected bcrypt error: %v", err)
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(data.Pass), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		data.Pass = string(hash)
	}
	raw, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return s.Update(func(tx *buntdb.Tx) error {
		_, _, err := tx.Set("user_"+data.Name, string(raw), nil)
		return err
	})
}

type Auth struct {
	Man   *ses.Manager
	Store *BuntUserStore
}

func (a *Auth) Logout(w http.ResponseWriter, r *http.Request) {
	a.Man.Clear(w, r)
	servePage(w, "Logout", `<h2>Logout</h2>
	<p>Du bist nun abgemeldet.<br>
	Du kannst dich <a href="/login">hier neu anmelden</a></p>`)
}

func (a *Auth) Login(w http.ResponseWriter, r *http.Request) {
	sess := ses.Get(r)
	if user := sess.User(); user != "" {
		servePage(w, "Login", `<h2>Login</h2>
		<p>Du bist bereits als `, escapeHTML(user), ` angemeldet.<br>
		Du kannst dich <a href="/">hier abmelden</a></p>`)
		return
	}
	var name, errmsg string
	var registered bool = true
	switch r.Method {
	case "POST":
		name = r.FormValue("name")
		if !nameCheck.MatchString(name) {
			if l := len(name); l < 3 || l > 20 {
				errmsg = "Name muss mindestens 3 und maximal 20 Zeichen haben."
			} else {
				errmsg = "Name kann Buchstaben, Zahlen, Punkt und Bindestrich enthalten."
			}
			break
		}
		user, err := a.Store.Get(name)
		if err != nil {
			if err == buntdb.ErrNotFound {
				// no user registered, save and redirect
				if registered {
					errmsg = "Benutzer nicht gefunden."
					break
				} else {

					a.loginSuccess(w, r, name, false)
				}
			} else {
				loginErrPage(w, `Leider ist Fehler mit der Datenbank aufgetreten.`)
			}
			return
		}
		// we have a registered user, check password
		registered = true
		pass := r.FormValue("pass")
		if pass == "" {
			errmsg = "Registrierte Benutzer benötigen ein Passwort."
			break
		}
		err = bcrypt.CompareHashAndPassword([]byte(user.Pass), []byte(pass))
		if err != nil {
			errmsg = "Passwort stimmt nicht überein."
			break
		}
		// password matches, save and redirect
		a.loginSuccess(w, r, name, user.Admin)
		return
	}
	var desc, fields string
	if registered {
		desc = `<p>Anmeldung benötigen ein Passwort.</p>`
		fields = `
		<input type="text" name="name" value="` + escapeHTML(name) + `">
		<input type="password" name="pass" placeholder="Passwort">
		<div>` + errmsg + `</div>`
	} else {
		desc = `<p>Du kannst dich hier einfach mit deinem Namen anmelden.</p>`
		fields = `
		<input type="text" name="name" value="` + escapeHTML(name) + `" placeholder="Name">
		<div>` + errmsg + `</div>`
	}
	servePage(w, "Login", `<h2>Login</h2>`, desc,
		`<form method="post">
		`, fields, `
		<button>Anmelden</button>
		</form>`,
	)
}

func (a *Auth) loginSuccess(w http.ResponseWriter, r *http.Request, name string, admin bool) {
	// save user details in session
	sess := ses.Get(r)
	s := sess.Data.(*Sess)
	s.Name = name
	s.Admin = admin
	err := a.Man.Save(w, sess)
	if err != nil {
		loginErrPage(w, `Leider ist Fehler mit der Datenbank aufgetreten.`)
		return
	}
	// and redirect
	http.Redirect(w, r, "/", http.StatusFound)
}

var nameCheck = regexp.MustCompile(`^[a-zA-Z0-9.-]{3,20}$`)

func loginErrPage(w http.ResponseWriter, msg string) {
	servePage(w, "Login", `<h2>Login</h2>
		<p>`, escapeHTML(msg), `<br>
		Versuche es später nochmal</p>`,
	)
}
