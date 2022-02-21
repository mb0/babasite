package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"xelf.org/daql/hub"
	"xelf.org/daql/hub/wshub"
)

func main() {
	s := NewGame()
	http.Handle("/hub", wshub.NewServer(s.Hub))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./index.html")
	})
	http.ListenAndServe("localhost:8080", nil)
}

type Game struct {
	*hub.Hub
	All map[int64]*User
}

type User struct {
	hub.Conn
	Name string
}

func NewGame() *Game {
	h := hub.NewHub(context.Background())
	g := &Game{Hub: h, All: make(map[int64]*User)}

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
		bcast, err := hub.RawMsg("chat", clickMsg{name, req.X, req.Y})
		if err != nil {
			log.Printf("failed to marshal chat message: %v", err)
			return
		}
		for _, c := range g.All {
			c.Chan() <- bcast
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
