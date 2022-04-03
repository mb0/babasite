package site

import (
	"sort"
	"time"

	"xelf.org/daql/hub"
)

type ChatData struct {
	Room  string     `json:"room"`
	Msgs  []ChatMsg  `json:"msgs"`
	Infos []UserInfo `json:"infos"`
}

type ChatMsg struct {
	User string    `json:"user"`
	Time time.Time `json:"time"`
	Msg  string    `json:"msg"`
}

type UserInfo struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Admin bool   `json:"admin,omitempty"`
}

type ChatRoom struct {
	ChatData
	Users map[int64]*User
	Conns []hub.Conn
}

func NewChat(name string) *ChatRoom {
	return &ChatRoom{
		ChatData: ChatData{Room: name},
		Users:    make(map[int64]*User),
	}
}
func (c *ChatRoom) Name() string { return c.Room }
func (c *ChatRoom) Bcast(m *hub.Msg) {
	for _, conn := range c.Conns {
		Send(conn, m)
	}
}

func (c *ChatRoom) Route(m *hub.Msg) {
	switch m.Subj {
	case "enter":
		enter, _ := m.Data.(*EnterMsg)
		if enter != nil && enter.User.Conn != nil {
			c.addUser(&enter.User)
		}
	case "exit":
		if id := FromID(m); id != 0 {
			c.delUser(id)
		}
	case "chat":
		var data ChatMsg
		m.Unmarshal(&data)
		data.Time = time.Now()
		if m.From != nil {
			data.User = m.From.User()
		} else if data.User == "" {
			data.User = "Server"
		}
		c.Msgs = append(c.Msgs, data)
		c.Bcast(RawMsg("chat", data))
	}
}

func (c *ChatRoom) addUser(u *User) {
	c.Users[u.ID()] = u
	info := UserInfo{ID: u.ID(), Name: u.Name, Admin: u.Admin}
	c.Infos = append(c.Infos, info)
	sort.Sort(sortInfos(c.Infos))
	c.Bcast(RawMsg("join", info))
	Send(u, RawMsg("hist", c.ChatData))
	c.Conns = append(c.Conns, u.Conn)
}

func (c *ChatRoom) delUser(id int64) {
	delete(c.Users, id)
	for i, info := range c.Infos {
		if info.ID == id {
			c.Infos = append(c.Infos[:i], c.Infos[i+1:]...)
			break
		}
	}
	for i, conn := range c.Conns {
		if conn.ID() == id {
			c.Conns = append(c.Conns[:i], c.Conns[i+1:]...)
			break
		}
	}
	c.Bcast(RawMsg("left", c.ChatData))
}

func FromID(m *hub.Msg) int64 {
	if m == nil || m.From == nil {
		return 0
	}
	return m.From.ID()
}

func RawMsg(subj string, data interface{}) *hub.Msg {
	m, err := hub.RawMsg(subj, data)
	if err != nil {
		panic(err)
	}
	return m
}

type sortInfos []UserInfo

func (a sortInfos) Len() int           { return len(a) }
func (a sortInfos) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
func (a sortInfos) Less(i, j int) bool { return a[i].Name < a[j].Name }

func Send(c hub.Conn, m *hub.Msg) {
	if c != nil {
		select {
		case c.Chan() <- m:
		default:
		}
	}
}
