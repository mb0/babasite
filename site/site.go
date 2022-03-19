package site

import (
	"context"
	"log"
	"time"

	"xelf.org/daql/hub"
)

type User struct {
	hub.Conn
	Name   string
	Admin  bool
	Room   Room
	Signon time.Time
}

type Room interface {
	Name() string
	hub.Router
}
type Site struct {
	*hub.Hub
	rooms map[string]Room
	users map[int64]*User
}

func NewSite(rooms ...Room) *Site {
	h := hub.NewHub(context.Background())
	s := &Site{Hub: h,
		rooms: make(map[string]Room),
		users: make(map[int64]*User),
	}
	for _, r := range rooms {
		s.rooms[r.Name()] = r
	}
	go h.Run(s)
	return s
}

func (s *Site) Route(m *hub.Msg) {
	id := FromID(m)
	switch m.Subj {
	case hub.Signon:
		log.Printf("user signed on")
		user := &User{Conn: m.From, Signon: time.Now()}
		s.users[id] = user
	case hub.Signoff:
		log.Printf("user signed off")
		user := s.users[id]
		if user != nil && user.Room != nil {
			user.Room.Route(&hub.Msg{Subj: "exit", From: m.From})
		}
		delete(s.users, id)
	case "enter":
		data := new(EnterMsg)
		m.Unmarshal(data)
		// enter a room
		user := s.users[id]
		if user != nil {
			if data.Name != "" {
				user.Name = data.Name
			}
			data.User = *user
			// find room
			room := s.rooms[data.Room]
			if room != nil {
				if user.Room != nil {
					user.Room.Route(&hub.Msg{Subj: "exit", From: m.From})
				}
				user.Room = room
				user.Room.Route(m)
				user.Chan() <- m.Reply(EnterMsg{Room: data.Room})
			}
		}
	case "exit":
		// exit current room
		user := s.users[id]
		if user != nil && user.Room != nil {
			user.Room.Route(m)
			user.Room = nil
		}
	default:
		user := s.users[id]
		if user != nil && user.Room != nil {
			user.Room.Route(m)
		}
	}
}

type EnterMsg struct {
	Room string      `json:"room"`
	Name string      `json:"name,omitempty"`
	User User        `json:"-"`
	Data interface{} `json:"data,omitempty"`
}
