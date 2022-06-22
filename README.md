babasite
========

babasite is (for now) an educational project to explore the creation of multi-player games.

We started with a simple index.html and a 2D canvas. We created the heaven and the earth and the sun
(painted two rectangles, one blue and one green and a yellow circle).
We tried to picture ourselves in that world (draw a stick figure). And it was fun.

Then we animated this lifeless world and adjusted the movement of the sun. And added endless clouds
to shake things up. Ah, the possibilities! But we are all alone in our new worlds… so we need to
connect our worlds together, with a websocket server.

We created Life (Conway's Game of) and watched its births and deaths. With new profound wisdom, we
think about sharing an experience for other to enjoy.

We want to create a world with characters within, that have agency and a complex world to explore.
We need a way to craft and form those beings and all the things in their world around them.

License
-------
Under BSD-2 Clause see LICENSE file for details and authors.

This project uses icons from [MaterialDesignIcons](https://github.com/Templarian/MaterialDesign)
under [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0)

Wie installieren
----------------
	$ git clone https://github.com/mb0/babasite
	$ cd babasite
	$ go get
	$ npm install

Der erste Befehl ruft git auf um das Projekt herunterzuladen und legt einen Ordner mit dem Namen
babasite an. Mit dem cd Befehl kann man in den neuen Ordner wechseln.
Git kann man auf dieser Seite herunterladen: https://git-scm.com/downloads

Mit go get ruft man den go Befehl der gleichnamigen Programmiersprache mit dem Unterbefehl get
auf um all Abhängigkeiten des Servers herunterzuladen. (Definiert in der Datei go.mod)
Go kann man auf dieser Seite herunterladen: https://go.dev/dl/

Mit npm install ruft man den npm Befehl zum Verwalten von Abhängigkeiten der Programmiersprachen
JavaScript und TypeScript mit dem Unterbefehl install um alle Abhängigkeiten für die Web
Benutzeroberfläche und das Kompilieren zu TypeScript herunterzuladen. (Definiert in der Datei
package.json)

Wie ausführen
-------------
	$ npm run dev

Mit npm run dev wird ein Programm gestartet das alle TypeScript Dateien (die mit .ts enden)
überwacht und bei Änderungen die Benutzeroberfläche neu kompiliert.
Programme im Terminal können meistens mit Ctrl-C oder Strg-C beendet werden.

	$ go install
	$ babasite

In einem anderen Terminal kann man dann mit go install den Server kompilieren.
Und dann starten. Wenn ein Bash Terminal benutzt wird kann man die Befehle mit && kombinieren.

	$ go install && babasite

Normalerweise installiert go die Datei in dem Ordner $HOME/go/bin , der normalerweise
nach einer go-Installation auf dem System-Pfad eingetragen ist.
