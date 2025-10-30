![version](https://img.shields.io/badge/version-0.7.8-blue)

🌍 Lies dies in anderen Sprachen:  
[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt.md) | [简体中文](README.zh-CN.md)

---

# Agile Board

**Agile Board** ist ein Plugin für [Obsidian](https://obsidian.md), das deine Notizen in visuelle Tafeln verwandelt.  
Jede Disposition basiert auf einer Vorlage (z. B. der Eisenhower-Matrix), die auf einem 24×24-Raster definiert ist.  
Abschnitte erscheinen als editierbare Rahmen („Boxes“): du kannst schreiben, Aufgaben einfügen, Dataview/Tasks-Abfragen, usw.

**Hinweis**: Inhalte werden immer im klassischen Markdown unter `#`-Überschriften gespeichert, was die volle Kompatibilität mit allen Notizen sicherstellt.

---

## 🎯 Funktionen

Verwandle deine Notizen in visuelle Dashboards mit editierbaren Rahmen.  
Jeder Rahmen entspricht einem Abschnitt (Überschrift der Ebene 1) mit Unterstützung für:

- **Rich Markdown**: `[[Links]]`, `- [ ] Aufgaben`, Formatierungen  
- **Smart Editing**: automatisch fortgesetzte Listen, anklickbare Checkboxen  
- **Plugin-Kompatibilität**: Dataview, Tasks usw.  
- **Live Preview**: Darstellung ähnlich wie in Obsidian mit einigen Einschränkungen  

## 🌍 Mehrsprachige Unterstützung

**NEU in v0.7.7**: Vollständige Internationalisierung mit **automatischer Spracherkennung**!

- 🇺🇸 **English** – Referenzsprache  
- 🇫🇷 **Français** – vollständige Übersetzung  
- 🇪🇸 **Español** – vollständige Übersetzung  
- 🇩🇪 **Deutsch** – vollständige Übersetzung  
- 🇵🇹 **Português** – vollständige Übersetzung  
- 🇨🇳 **中文 (简体)** – 完整翻译  

Die Benutzeroberfläche passt sich automatisch an die Spracheinstellung von Obsidian an.  
Alle UI-Elemente, Einstellungen, Meldungen und Tooltips sind mit **96 Übersetzungs-Schlüsseln** in allen Sprachen verfügbar.

## ⚠️ Aktuelle Einschränkungen

Der Board-Modus verwendet CodeMirror 6 für die Bearbeitung, enthält aber nicht alle erweiterten Funktionen von Obsidian:

- **Link-Vorschläge**: Beim Tippen von `[[` werden keine Notizen vorgeschlagen (du kannst den vollständigen Link trotzdem manuell eingeben)
- **Inline Plugin Calls**: Inline-Dataview-Abfragen (`= this.file.name`) oder Templater-Befehle (`<% tp.date.now() %>`) werden in Rahmen nicht ausgeführt

### 📎 Embed-Unterstützung

**NEU**: Embed-Vorschau wird jetzt im Board-Modus unterstützt!

- **Bilder**: `![[image.png]]` wird korrekt im Vorschaumodus angezeigt
- **Notizen**: `![[andere-notiz.md]]` rendert den Notizeninhalt
- **Obsidian Bases**: `![[table.base]]` zeigt interaktive Datenbankansichten an

**Persistente Ansichtsauswahl für Bases**: Um die Ansichtsauswahl in einer Base persistent zu machen, verwende die Fragment-Syntax:
```markdown
![[table.base#AnsichtsName]]
```
Dies stellt sicher, dass die angegebene Ansicht beim Laden der Notiz immer angezeigt wird.

## 🔄 Zwei Anzeigemodi

**🏢 Board-Modus**: Raster aus editierbaren Rahmen mit Live-Preview-Funktionen  
**📄 Normaler Modus**: Klassisches Obsidian-Markdown-Editing  

Wechsel zwischen den Modi über die Symbolleisten-Icons.

![Agile Board – Eisenhower Example](./agile-board-eisenhower.gif)

---

## 🚀 Installation

### Option 1 – Komplettes Vault (empfohlen)

1. Lade `Agile-Board-v0.7.7.zip` herunter (Obsidian-Vault mit Plugin und Beispielen)  
2. Entpacken und den Ordner direkt in Obsidian öffnen  

### Option 2 – Nur Plugin

1. Von [GitHub Releases](https://github.com/a198h/agile-board/releases) herunterladen  
2. Den Ordner `agile-board` nach `.obsidian/plugins/` kopieren  
3. Obsidian neu starten und Plugin aktivieren  
4. **5 Standard-Dispositionen sind enthalten**  

### Option 3 – BRAT (Beta Testing)

Installation über [BRAT](https://github.com/TfTHacker/obsidian42-brat), um die neuesten Updates zu erhalten:

1. BRAT-Plugin installieren und aktivieren  
2. `a198h/agile-board` als Beta-Plugin hinzufügen  
3. BRAT aktualisiert das Plugin automatisch  

---

## 📝 Verwendung

### Konfiguration

Um eine Disposition für eine Notiz zu aktivieren, füge diese Zeile zu den Eigenschaften (Frontmatter) hinzu:

```yaml
---
agile-board: eisenhower
---
```

**Verfügbare Dispositionen** (standardmäßig enthalten):

- `eisenhower`: 4-Quadranten-Matrix wichtig/dringend  
- `swot`: Situation analysieren  
- `moscow`: Anforderungen priorisieren (Must/Should/Could/Won’t)  
- `effort_impact`: Maßnahmen nach Aufwand und Wirkung beurteilen  
- `cornell`: Aktives Mitschreiben  

Das 🏢-Icon erscheint in der Symbolleiste. Klick zum Wechsel in den Board-Modus.

### Bearbeitung

- **Klick auf einen Rahmen** → Bearbeitungsmodus  
- **Intelligente Listen**: Aufzählungen und nummerierte Listen  
- **Checkboxen**: Klick zum Abhaken/Entfernen, automatische Synchronisierung  
- **Abfragen**: Query, Dataview, Tasks  

---

## ⚙️ Plugin-Einstellungen

Über **Einstellungen → Community-Plugins → Agile Board** kannst du deine Dispositionen direkt in Obsidian verwalten.

![Agile Board – Config](./agile-board-customize-board.png)

### 📋 Dispositionsverwaltung

Die Liste der verfügbaren Dispositionen erscheint automatisch in den Einstellungen.  
Jede Disposition entspricht einer `.json`-Datei im Ordner `layouts` des Plugins (Benutzer müssen diesen Ordner nicht manuell bearbeiten).

- **Disposition erstellen**: ➕-Button, Name eingeben  
- **Disposition bearbeiten**: ✏️-Icon öffnet den visuellen Editor  
- **Disposition duplizieren**: 📑-Icon  
- **Export / Import**: ⬆️ und ⬇️-Icons zum Teilen oder Laden einer Konfiguration  
- **Disposition löschen**: 🗑️-Icon  

### 🎨 Visueller Editor

Der Dispositions-Editor zeigt ein **24×24-Raster**, auf dem du **Rahmen** platzieren kannst:

- **Erstellen**: Klicken und ziehen  
- **Verschieben**: Rahmen ziehen  
- **Größe ändern**: Runde Griffe verwenden  
- **Umbenennen**: Titel im Seitenpanel ändern  
- **Löschen**: roter „🗑️“-Button  
- **Alles löschen**: roter „🗑️ Clear all boxes“-Button unterhalb des Hilfebereichs  

Jeder Rahmen entspricht einem **Notizabschnitt**: einer **Überschrift Ebene 1** (`#`) gefolgt vom Inhalt.

---

## ✨ Features

- **Automatische Synchronisierung**: Änderungen in visuellen Rahmen werden direkt in der Markdown-Datei gespeichert  
- **Automatische Abschnitte**: Fehlende Abschnitte werden unterstützt erstellt  
- **Plugin-Kompatibilität**: Dataview, Tasks und Templater scheinen normal zu funktionieren (Bugs melden!); andere Plugins noch zu prüfen  

---

## 💡 Inspiration

Dieses Plugin ist inspiriert von [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) und baut auf dem Konzept auf, Markdown-Notizen in visuelle Dispositionen zu verwandeln.

---

## 📂 Dein Beitrag zählt!

- **Bugs/Issues**: [https://github.com/a198h/agile-board/issues](https://github.com/a198h/agile-board/issues)  
- **Diskussionen**: [https://github.com/a198h/agile-board/discussions/8](https://github.com/a198h/agile-board/discussions/8)  

## Unterstütze mich
Wenn du meine Arbeit nützlich findest, kannst du mich hier unterstützen:  
[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)
