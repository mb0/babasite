game/bolt
=========

Paket bolt ermöglicht es Spieldaten in eine bbolt Datenbank zu speichern.

Aktive Spieldaten werden meistens erst in den Speicher geladen und Änderungen dann gesammelt in die
nach einer Zeit in die Datenbank gespeichert.

Warum bbolt?
------------

Es gibt viele verschiedene Datenbanken die wir nutzen könnten, deren Hauptunterscheidung ist
ob es SQL Datenbanken sind oder nicht. SQL ist eine Abfragesprache für relationale Datenbanken,
die konzeptionell wie eine Menge von Tabellen aufgebaut ist. No-SQL Datenbanken sind konzeptionell
einfache Paare von Schlüssel zu Werten (key-value-stores).

Wir wollen eine DB die:
	* wir nicht extra installieren müssen, also in unser Programm einbetten können.
	* sehr schnell und flexibel ist und trotzdem die daten dauerhaft speichert.
	* die nur eine Datei auf der Festplatte benutzt.
	* erprobt ist, damit Spieldaten nicht verloren gehen.
	* minimal ist aber praktisch ausreicht

Die bbolt Datenbank erfüllt alle diese Anforderungen und bietet eine praktische möglichkeit Daten in
verschiedene Buckets (Eimer) zu struckturieren. Buckets enthalten einfache key-value Paare oder
wiederum verschachtelte buckets und eine Sequenznummer die wir als ID benutzen können.
Alle Paare in einem bucket können außerdem sortiert abgefragt werden.

Aufbau
------

Wir wollen vorerst eine Datenbank für alle Welten, Bilder und Spiele benutzen.
Anders als zuvor möchte ich, dass alle Spieldaten zu einer einzelnen Welt gehören, stattdessen
sollte es einfach sein Spieldaten aus anderen Welten zu importieren.

Jede Welt hat einen Namen und eine Version, so können wir z.B. veröffentlichte Versionen der
Welt erhalten und gleichzeitig an einer neuen Version arbeiten.

Jeder Spielstand soll grundsätzlich eine voll veränderbare Welt sein. Um aber nicht alle Daten
kopieren zu müssen könnten vor eine sog. copy-on-write Konzept benutzen, also dass wir
im Spielstand nur Welt und die geänderten Daten speichern.

Die Datenbank hat also eine Liste von welt und spiel buckets die durch eine prefix getrennt sind:

	* w~moon: Welt bucket mit verschachtelten buckets für allen Arten von Spieldaten
		* lvl: bucket mit allen Levels
			* 00000001: level data
	* w~moon@1: alte veröffentlichte Welt mit allen Spieldaten
	* w~mars: andere Welt
	* g~uvw: savegame bucket
	* g~xyz: other savegame bucket
