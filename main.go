package main

import (
	"archive/zip"
	"flag"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/mb0/babasite/gol"
	"github.com/mb0/babasite/site"
	"github.com/mb0/babasite/wedit"
	"github.com/tidwall/buntdb"
	"xelf.org/daql/hub/wshub"
	"xelf.org/daql/ses"
	"xelf.org/xelf/bfr"
)

var addr = flag.String("addr", "localhost:8080", "http server address")
var datapath = flag.String("data", "data/", "data path")
var dbpath = flag.String("db", "data/data.db", "buntdb file path or :memory:")
var dev = flag.Bool("dev", false, "development flag to allow http cookies")

func main() {
	// parse the above command line args e.g. "babasite -db=./mydata.db"
	flag.Parse()

	// open a simple database
	db, err := buntdb.Open(*dbpath)
	if err != nil {
		log.Fatalf("failed to open %s: %v", *dbpath, err)
	}
	// close the db when the main function ends
	defer db.Close()
	userStore := &site.BuntUserStore{DB: db}
	switch subcmd := flag.Arg(0); subcmd {
	case "register-user", "register-admin":
		user := site.UserData{
			Name:    flag.Arg(1),
			Pass:    flag.Arg(2),
			Admin:   subcmd == "register-admin",
			Created: time.Now(),
		}
		if user.Name == "" || user.Pass == "" {
			log.Fatalf("%s requires name and pass. use:\n\t$ babasite %s mb0 test",
				subcmd, subcmd,
			)
		}
		err := userStore.Save(user)
		if err != nil {
			log.Fatalf("%s failed: %v", subcmd, err)
		}
		log.Printf("%s %s successful!", subcmd, user.Name)
		return
	case "":
	default:
		log.Fatalf("unknown subcommand %s", subcmd)
	}

	// setup session manager to remember users
	man, err := site.SetupSess(db, "babasite", !*dev)
	if err != nil {
		log.Fatal(err)
	}

	auth := site.Auth{Man: man, Store: userStore}

	wed, err := wedit.NewRoom(*datapath)
	if err != nil {
		log.Fatal(err)
	}
	// create new site with multiple rooms
	s := site.NewSite(
		site.NewChat("simple"),
		gol.NewRoom("gol"),
		wed,
	)
	exporter := &Exporter{Path: *datapath, List: []ExportFunc{wed.Export}}

	// create a mux or also known as router where we provide session cookies
	sesmux := http.NewServeMux()
	// only logged in users are allowed to connect to the websocket server
	hubsrv := wshub.NewServer(s.Hub)
	hubsrv.UserFunc = func(r *http.Request) (string, error) {
		if s := ses.Get(r); site.IsUserSess(s) {
			return s.User(), nil
		}
		return "", fmt.Errorf("not authorized")
	}
	sesmux.Handle("/baba_export.zip", site.Authenticate(exporter))
	sesmux.Handle("/hub", site.Authenticate(hubsrv))
	sesmux.HandleFunc("/login", auth.Login)
	sesmux.HandleFunc("/logout", auth.Logout)
	// we want to provide session info for the index site, to remember users
	sesmux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if s := ses.Get(r); !site.IsUserSess(s) {
			http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
		} else {
			http.ServeFile(w, r, "./dist/index.html")
		}
	})

	// create a public http server mux
	srvmux := http.NewServeMux()
	// serve resources publicly without providing session cookies
	srvmux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {})
	srvmux.Handle("/dist/", http.StripPrefix("/dist/", http.FileServer(http.Dir("./dist"))))
	// route non-resource requests to the mux the provides sessions
	srvmux.Handle("/", ses.Provider{Manager: man, Next: sesmux})

	fmt.Printf("starting server on http://%s\n", *addr)
	err = http.ListenAndServe(*addr, srvmux)
	if err != nil {
		fmt.Println(err)
	}
}

type ExportFunc func(string, *zip.Writer) error
type Exporter struct {
	Path string
	List []ExportFunc
}

func (e *Exporter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "not allowed", http.StatusMethodNotAllowed)
		return
	}
	b := bfr.Get()
	defer bfr.Put(b)
	zw := zip.NewWriter(b)
	for _, ex := range e.List {
		err := ex(e.Path, zw)
		if err != nil {
			msg := fmt.Sprintf("export failed: %v", err)
			http.Error(w, msg, http.StatusInternalServerError)
			return
		}
	}
	err := zw.Close()
	if err != nil {
		msg := fmt.Sprintf("export failed: %v", err)
		http.Error(w, msg, http.StatusInternalServerError)
		return
	}
	h := w.Header()
	h.Set("Content-Disposition", `inline; filename="baba_export.zip"`)
	h.Set("Content-Type", `application/zip`)
	h.Set("Content-Length", fmt.Sprint(b.Len()))
	_, err = b.WriteTo(w)
	if err != nil {
		log.Printf("export failed: %v", err)
		return
	}
}
