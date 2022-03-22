package main

import (
	"flag"
	"fmt"
	"net/http"

	"github.com/mb0/babasite/gol"
	"github.com/mb0/babasite/maped"
	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub/wshub"
)

var addr = flag.String("addr", "localhost:8080", "http server address")

func main() {
	flag.Parse()
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
