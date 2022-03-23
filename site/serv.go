package site

import (
	"fmt"
	"io"
	"net/http"
	"text/template"
)

const htmlStart = `<!DOCTYPE html>
<html>
<head><title>`
const htmlMiddle = `</title>
</head>
<body>
`
const htmlEnd = `
</body>
</html>
`

var escapeHTML = template.HTMLEscapeString

func servePage(w http.ResponseWriter, title string, content ...string) {
	strs := make([]string, 0, 4+len(content))
	strs = append(strs, htmlStart, title, htmlMiddle)
	strs = append(strs, content...)
	strs = append(strs, htmlEnd)
	serveHTML(w, strs...)
}

func serveHTML(w http.ResponseWriter, strs ...string) {
	h := w.Header()
	h.Set("Content-Type", "text/html; charset=utf-8")
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Cache-Control", "private, no-cache")
	var size int
	for _, str := range strs {
		size += len(str)
	}
	h.Set("Content-Length", fmt.Sprint(size))
	w.WriteHeader(200)
	for _, str := range strs {
		_, err := io.WriteString(w, str)
		if err != nil {
			break
		}
	}
}
