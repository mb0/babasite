package gol

import (
	"log"
	"time"

	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type Room struct {
	site.ChatRoom
	input chan *hub.Msg
	Map   *Map
	play  bool
}

func NewRoom(name string) *Room {
	g := &Room{
		ChatRoom: *site.NewChat(name),
		input:    make(chan *hub.Msg, 64),
		Map:      NewMap(80, 60),
	}
	go func() {
		ticker := time.NewTicker(time.Second)
		tick, _ := hub.RawMsg("_tick", nil)
		for {
			select {
			case m := <-g.input:
				g.handle(m)
			case <-ticker.C:
				g.handle(tick)
			}

		}
	}()
	return g
}
func (g *Room) Route(m *hub.Msg) {
	g.input <- m
}
func (g *Room) handle(m *hub.Msg) {
	switch m.Subj {
	case "enter":
		g.Enter(m)
		hub.Send(m.From, site.RawMsg("map", g.Map))
	case "exit":
		g.Exit(m)
	case "chat":
		g.Chat(m)
	case "click":
		var req clickMsg
		err := m.Unmarshal(&req)
		if err != nil {
			log.Printf("failed to parse chat message: %v", err)
			return
		}
		var name string
		if user := g.Users[site.FromID(m)]; user != nil {
			name = user.Name
		}
		g.Map.Click(req.X, req.Y)
		g.Bcast(site.RawMsg("click", clickMsg{name, req.X, req.Y}), 0)
	case "step":
		g.Map.Step()
		g.Bcast(site.RawMsg("map", g.Map), 0)
	case "reset":
		g.Map = NewMap(80, 60)
		g.Bcast(site.RawMsg("map", g.Map), 0)
	case "play":
		g.play = !g.play
	case "_tick":
		if g.play {
			g.Map.Step()
			g.Bcast(site.RawMsg("map", g.Map), 0)
		}
	}
}

type clickMsg struct {
	User string `json:"user"`
	X    int    `json:"x"`
	Y    int    `json:"y"`
}
