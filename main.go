package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/mb0/babasite/gol"
	"xelf.org/daql/hub"
	"xelf.org/daql/hub/wshub"
)

var addr = flag.String("addr", "localhost:8080", "http server address")

func main() {
	flag.Parse()
	s := NewGame()
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

type Game struct {
	*hub.Hub
	All  map[int64]*User
	Map  *gol.Map
	Play bool
}

type User struct {
	hub.Conn
	Name string
}

func NewGame() *Game {
	h := hub.NewHub(context.Background())
	var m *gol.Map = gol.NewMap(80, 60)
	g := &Game{
		Hub: h,
		All: make(map[int64]*User),
		Map: m,
	}

	go func() {
		tick := time.NewTicker(time.Second)
		tickmsg, _ := hub.RawMsg("_tick", nil)
		for range tick.C {
			h.Chan() <- tickmsg
		}
	}()

	go h.Run(g)
	return g
}

func (g *Game) Route(m *hub.Msg) {
	switch m.Subj {
	case hub.Signon:
		log.Printf("user signed on")
		id := m.From.ID()
		name := fmt.Sprintf("User%d", id)
		g.All[id] = &User{Conn: m.From, Name: name}
		hello, _ := hub.RawMsg("chat", chatMsg{"Server", fmt.Sprintf("Hello user %s", name)})
		m.From.Chan() <- hello
		mapmsg, _ := hub.RawMsg("map", g.Map)
		m.From.Chan() <- mapmsg
	case hub.Signoff:
		log.Printf("user signed off")
		delete(g.All, m.From.ID())
	case "chat":
		var req chatMsg
		err := m.Unmarshal(&req)
		if err != nil {
			log.Printf("failed to parse chat message: %v", err)
			return
		}
		var name string
		if user := g.All[m.From.ID()]; user != nil {
			name = user.Name
		}
		bcast, err := hub.RawMsg("chat", chatMsg{name, req.Msg})
		if err != nil {
			log.Printf("failed to marshal chat message: %v", err)
			return
		}
		for _, c := range g.All {
			c.Chan() <- bcast
		}
	case "click":
		var req clickMsg
		err := m.Unmarshal(&req)
		if err != nil {
			log.Printf("failed to parse chat message: %v", err)
			return
		}
		var name string
		if user := g.All[m.From.ID()]; user != nil {
			name = user.Name
		}
		g.Map.Click(req.X, req.Y)
		bcast, err := hub.RawMsg("click", clickMsg{name, req.X, req.Y})
		if err != nil {
			log.Printf("failed to marshal chat message: %v", err)
			return
		}
		for _, c := range g.All {
			c.Chan() <- bcast
		}
	case "step":
		g.Map.Step()
		mapmsg, _ := hub.RawMsg("map", g.Map)
		for _, c := range g.All {
			c.Chan() <- mapmsg
		}
	case "reset":
		g.Map = gol.NewMap(80, 60)
		mapmsg, _ := hub.RawMsg("map", g.Map)
		for _, c := range g.All {
			c.Chan() <- mapmsg
		}
	case "play":
		g.Play = !g.Play
	case "_tick":
		if g.Play {
			g.Map.Step()
			mapmsg, _ := hub.RawMsg("map", g.Map)
			for _, c := range g.All {
				c.Chan() <- mapmsg
			}
		}
	}
}

type chatMsg struct {
	User string `json:"user"`
	Msg  string `json:"msg"`
}

type clickMsg struct {
	User string `json:"user"`
	X    int    `json:"x"`
	Y    int    `json:"y"`
}
