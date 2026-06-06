![version](https://img.shields.io/badge/version-0.9.1-blue) ![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A50.15.0-7C3AED) ![1.13+](https://img.shields.io/badge/1.13%2B-compatible-brightgreen) ![Desktop only](https://img.shields.io/badge/Plattform-Desktop-lightgrey)

🌍 Lies dies in anderen Sprachen:
[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt.md) | [简体中文](README.zh-CN.md) | [Русский](README.ru.md)

---

# Agile Board

**Agile Board** verwandelt deine Obsidian-Notizen in interaktive visuelle Boards. Deine Abschnitte werden zu editierbaren Rahmen auf einem Raster — während sie unter der Haube immer gültiges, portables Markdown bleiben.

![Agile Board – Eisenhower-Beispiel](./agile-board-eisenhower.gif)

---

## 🆕 Neuigkeiten

### v0.9.1 — Kompatibilitätspatch für Obsidian 1.13.0
Die Größenänderungs-Handles des Layout-Editors funktionierten nach Obsidians Chromium-Aktualisierung in v1.13.0 nicht mehr. Dieser Patch stellt den visuellen Editor auf allen unterstützten Versionen vollständig wieder her.

### v0.9.0 — Popout-Editor

> Bisher erforderte das Bearbeiten eines Rahmens das Umschalten der gesamten Notiz in den Bearbeitungsmodus, was es schwierig machte, zu schreiben und dabei das Board sichtbar zu halten.

**Du kannst jetzt auf einen Rahmentitel doppelklicken, um den Inhalt in einem eigenen Fenster zu öffnen**, mit vollständiger Obsidian Live Preview. Der Inhalt wird beim Schließen des Fensters automatisch zurückgesynchronisiert. Gesperrte Rahmen können nicht im Popout geöffnet werden.

![Agile Board – Board zu Markdown](./Agile-Board-Board-to-Markdown_c.gif)

---

## 🎯 Funktionen

### Board & Bearbeitung
- **Zwei Anzeigemodi**: wechsle frei zwischen dem visuellen Board (🏢) und der klassischen Markdown-Bearbeitung (📄)
- **Editierbare Rahmen**: klicke auf einen Rahmen, um den Bearbeitungsmodus mit CodeMirror 6 zu öffnen
- **Popout-Editor**: Doppelklick auf einen Rahmentitel öffnet ihn in einem separaten Fenster — halte das Board sichtbar während du schreibst
- **Intelligente Bearbeitung**: automatisch fortgesetzte Listen und Callouts, anklickbare Checkboxen mit sofortiger Synchronisation
- **Rich Markdown**: `[[Links]]`, `- [ ] Aufgaben`, Formatierung, Codeblöcke, horizontale Linien

### Rahmen-Anpassung
- **Rahmensperrung**: sperre einen Rahmen, um versehentliche Bearbeitungen zu verhindern — Links, Embeds und Checkboxen bleiben funktionsfähig
- **Schriftgröße**: passe die Textskalierung aller Rahmen (0,7× bis 1,5×) in den Plugin-Einstellungen an
- **Benutzerdefinierte Farben**: weise jedem Rahmen eine Farbe zu — getönte Titelleiste und farbige Umrandung in der Board-Ansicht

![Agile Board – Rahmensperre](./Agile-Board-Lock-frame_c.gif)
![Agile Board – Schriftgröße](./Agile-Board-Font-Size-in-Board_c.gif)

### Einbettungen & Plugin-Kompatibilität
- **Bilder**: `![[bild.png]]` wird in der Board-Vorschau korrekt angezeigt
- **Notizen**: `![[andere-notiz.md]]` bettet den Inhalt der Notiz direkt in den Rahmen ein
- **Obsidian Bases**: `![[tabelle.base]]` zeigt interaktive Datenbankansichten; nutze `![[tabelle.base#AnsichtName]]`, um die gewählte Ansicht zu merken
- **Dataview & Tasks**: Abfragen werden normal innerhalb der Rahmen berechnet und aktualisiert
- **Kontextmenü & Drucken**: Rechtsklick auf den Board-Tab für alle Standard-Obsidian-Optionen sowie direktes Drucken des Boards

![Agile Board – Kontextmenü](./Agile-Board-Menu_c.gif)
![Agile Board – Board drucken](./Agile-Board-Print-Board_c.gif)

---

## ⚠️ Bekannte Einschränkungen

Der Rahmen-Editor verwendet CodeMirror 6, bildet jedoch nicht alle Obsidian-Bearbeitungsfunktionen nach:

- **Link-Vorschläge**: das Tippen von `[[` schlägt keine Notizen vor — tippe den vollständigen Link manuell
- **Inline-Plugin-Aufrufe**: Inline-Dataview-Abfragen (`= this.file.name`) und Templater-Befehle (`<% tp.date.now() %>`) werden in Rahmen nicht ausgeführt
- **Nur Desktop**: Boards sind auf Mobilgeräten nicht verfügbar — deine Notizen bleiben auf Mobilgeräten als normales Markdown lesbar

---

## 🚀 Installation

**Voraussetzungen**: Obsidian Desktop ≥ 0.15.0. Kompatibel mit Obsidian 1.13.0 (Catalyst) und späteren Versionen.

### Option 1 — BRAT (Empfohlen)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) übernimmt automatische Updates:

1. Installiere und aktiviere das Community-Plugin **BRAT**
2. Füge in den BRAT-Einstellungen `a198h/agile-board` hinzu
3. BRAT installiert das Plugin und hält es automatisch aktuell

### Option 2 — Manuelle Installation

1. Lade `main.js`, `manifest.json` und `styles.css` aus dem [neuesten GitHub-Release](https://github.com/a198h/agile-board/releases/latest) herunter
2. Kopiere die drei Dateien nach `.obsidian/plugins/agile-board/`
3. Starte Obsidian neu und aktiviere **Agile Board** unter Einstellungen → Community-Plugins

> **5 Standard-Layouts sind im Plugin enthalten** — kein zusätzlicher Download erforderlich.

---

## 📝 Schnellstart

### 1. Layout auf einer Notiz aktivieren

Füge die Eigenschaft `agile-board` in den Frontmatter der Notiz ein:

```yaml
---
agile-board: eisenhower
---
```

Klicke auf das 🏢-Symbol in der Toolbar, um in den Board-Modus zu wechseln.

### 2. Verfügbare Layouts

| Layout | Beschreibung |
|---|---|
| `eisenhower` | 4-Quadranten-Matrix Wichtig / Dringend |
| `swot` | Stärken, Schwächen, Chancen, Risiken |
| `moscow` | Must / Should / Could / Won't Priorisierung |
| `effort_impact` | Aktionspriorisierung nach Wirksamkeit |
| `cornell` | Aktive Mitschreibemethode |

### 3. Rahmen bearbeiten

- **Einfacher Klick** → Bearbeitungsmodus
- **Doppelklick auf den Titel** → Im Popout-Fenster öffnen
- Änderungen werden automatisch in der Markdown-Datei gespeichert

---

## ⚙️ Plugin-Einstellungen

Öffne **Einstellungen → Community-Plugins → Agile Board**, um Layouts und Erscheinungsbild zu verwalten.

![Agile Board – Konfiguration](./agile-board-customize-board.png)

### Layout-Verwaltung

Jedes Layout ist eine `.json`-Datei im `layouts/`-Ordner des Plugins. Im Einstellungsbereich:

| Aktion | Steuerung |
|---|---|
| Erstellen | ➕-Schaltfläche — Namen eingeben |
| Bearbeiten | ✏️-Symbol — öffnet den visuellen Editor |
| Duplizieren | 📑-Symbol |
| Exportieren / Importieren | ⬆️ / ⬇️-Symbole — Konfigurationen teilen oder laden |
| Löschen | 🗑️-Symbol |

### Visueller Layout-Editor

Der Editor zeigt ein **24×24-Raster**, auf dem du **Boxes** (Rahmen) platzierst und ihre Größe änderst:

- **Erstellen**: auf einen leeren Bereich klicken und ziehen
- **Verschieben**: eine Box ziehen, um sie neu zu positionieren
- **Größe ändern**: die kreisförmigen Handles an den Ecken und Kanten der Box ziehen
- **Umbenennen**: den Titel im Seitenbereich bearbeiten
- **Farbe**: eine benutzerdefinierte Farbe im Seitenbereich wählen — **Zurücksetzen** klicken, um zur Palettenfarbe zurückzukehren
- **Löschen**: 🗑️-Schaltfläche im Seitenbereich
- **Alle löschen**: entfernt alle Boxes aus dem Layout (mit Bestätigung)

Jede Box entspricht einer **Überschrift der Ebene 1** (`#`) in der Notiz und dem darauf folgenden Inhalt.

---

## 🌍 Mehrsprachige Unterstützung

Die Oberfläche passt sich automatisch an deine Obsidian-Sprache an. Alle UI-Elemente, Einstellungen, Meldungen und Tooltips sind in **7 Sprachen** verfügbar (96 Übersetzungsschlüssel):

| Sprache | Status |
|---|---|
| 🇺🇸 English | Referenz |
| 🇫🇷 Français | vollständig |
| 🇪🇸 Español | vollständig |
| 🇩🇪 Deutsch | vollständig |
| 🇵🇹 Português | vollständig |
| 🇨🇳 中文 (简体) | vollständig |
| 🇷🇺 Русский | vollständig |

---

## 💡 Inspiration

Dieses Plugin ist von [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) inspiriert und baut auf der Idee auf, Markdown-Notizen in visuelle Layouts zu verwandeln.

---

## 📂 Mitwirken & Support

- **Fehlerberichte & Funktionsanfragen**: [GitHub Issues](https://github.com/a198h/agile-board/issues)
- **Diskussionen**: [GitHub Discussions](https://github.com/a198h/agile-board/discussions/8)

Wenn dir dieses Plugin nützlich ist, kannst du die Entwicklung unterstützen:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)
