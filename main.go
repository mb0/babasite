package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"github.com/mb0/babasite/gol"
	"github.com/mb0/babasite/maped"
	"github.com/mb0/babasite/site"
	"github.com/tidwall/buntdb"
	"xelf.org/daql/hub/wshub"
)

var addr = flag.String("addr", "localhost:8080", "http server address")
var dbpath = flag.String("db", "data.db", "buntdb file path or :memory:")

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

	s := site.NewSite(
		site.NewChat("simple"),
		gol.NewRoom("gol"),
		maped.NewRoom("maped"),
	)
	http.Handle("/hub", wshub.NewServer(s.Hub))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./index.html")
	})
	http.HandleFunc("/game", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./game.html")
	})
	http.Handle("/js/", http.StripPrefix("/js/", http.FileServer(http.Dir("./js"))))
	fmt.Printf("starting server on http://%s\n", *addr)
	http.ListenAndServe(*addr, nil)
}
