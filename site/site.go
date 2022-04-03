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
		name := m.From.User()
		log.Printf("user %s signed on", name)
		user := &User{Conn: m.From, Name: name, Signon: time.Now()}
		s.users[id] = user
	case hub.Signoff:
		log.Printf("user %s signed off", m.From.User())
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
			data.User = *user
			// find room
			room := s.rooms[data.Room]
			if room != nil {
				if user.Room != nil {
					user.Room.Route(&hub.Msg{Subj: "exit", From: m.From})
				}
				Send(user, m.Reply(EnterMsg{Room: data.Room}))
				user.Room = room
				user.Room.Route(m)
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
	User User        `json:"-"`
	Data interface{} `json:"data,omitempty"`
}
