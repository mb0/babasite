package maped

import (
	"log"

	"github.com/mb0/babasite/site"
	"xelf.org/daql/hub"
)

type Room struct {
	site.ChatRoom
	Map *Map
}

func NewRoom(name string) *Room {
	g := &Room{
		ChatRoom: *site.NewChat(name),
		Map:      NewMap("", 80, 60, nil),
	}
	return g
}
func (g *Room) Route(m *hub.Msg) {
	switch m.Subj {
	case "enter":
		g.ChatRoom.Route(m)
		hub.Send(m.From, site.RawMsg("map", g.Map))
	case "exit", "chat":
		g.ChatRoom.Route(m)
	case "modtile":
		var req modTile
		err := m.Unmarshal(&req)
		if err != nil {
			log.Printf("failed to parse modtile message: %v", err)
			return
		}
		g.Map.Tiles[req.Y*g.Map.W+req.X] = req.Tile
		g.Bcast(site.RawMsg("modtile", req))
	}
}

type modTile struct {
	X    int  `json:"x"`
	Y    int  `json:"y"`
	Tile Tile `json:"tile"`
}
