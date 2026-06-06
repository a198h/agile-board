![version](https://img.shields.io/badge/version-0.9.1-blue) ![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A50.15.0-7C3AED) ![1.13+](https://img.shields.io/badge/1.13%2B-compatible-brightgreen) ![Desktop only](https://img.shields.io/badge/platform-desktop-lightgrey)

🌍 Read this in other languages:
[Français](README.fr.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [简体中文](README.zh-CN.md) | [Русский](README.ru.md)

---

# Agile Board

**Agile Board** transforms your Obsidian notes into interactive visual boards. Your sections become editable frames arranged on a grid — while always remaining valid, portable Markdown under the hood.

![Agile Board – Eisenhower Example](./agile-board-eisenhower.gif)

---

## 🆕 What's New

### v0.9.1 — Obsidian 1.13.0 compatibility fix
Resize handles in the layout editor stopped working after Obsidian's Chromium upgrade in v1.13.0. This patch fully restores the visual editor on all supported versions.

### v0.9.0 — Popout editor

> Previously, editing a frame required switching the whole note to edit mode, making it difficult to write while keeping the board visible.

**You can now double-click any frame title to open its content in a dedicated window**, with full Obsidian Live Preview. The content syncs back automatically when the window is closed. Locked frames cannot be opened in popout.

![Agile Board – Board to Markdown](./Agile-Board-Board-to-Markdown_c.gif)

---

## 🎯 Features

### Board & Editing
- **Two display modes**: switch freely between the visual board (🏢) and classic Markdown editing (📄)
- **Editable frames**: click any frame to enter edit mode with CodeMirror 6
- **Popout editor**: double-click a frame title to edit in a separate window — keep the board visible while writing
- **Smart editing**: auto-continued lists and callouts, clickable checkboxes with instant sync
- **Rich Markdown**: `[[links]]`, `- [ ] tasks`, formatting, code blocks, horizontal rules

### Frame Customization
- **Frame lock**: lock a frame to prevent accidental edits — links, embeds and checkboxes still work when locked
- **Font size**: adjust text scale across all frames (0.7× to 1.5×) from plugin settings
- **Custom colors**: assign a color to any frame — tinted title bar and colored border in the board view

![Agile Board – Lock Frame](./Agile-Board-Lock-frame_c.gif)
![Agile Board – Font Size](./Agile-Board-Font-Size-in-Board_c.gif)

### Embeds & Plugin Compatibility
- **Images**: `![[image.png]]` renders correctly in board preview
- **Notes**: `![[other-note.md]]` embeds the note content directly in the frame
- **Obsidian Bases**: `![[table.base]]` displays interactive database views; use `![[table.base#ViewName]]` to remember the selected view
- **Dataview & Tasks**: queries render and update normally inside frames
- **Context menu & print**: right-click the board tab for all standard Obsidian options, plus direct board printing

![Agile Board – Context Menu](./Agile-Board-Menu_c.gif)
![Agile Board – Print Board](./Agile-Board-Print-Board_c.gif)

---

## ⚠️ Known Limitations

The frame editor uses CodeMirror 6 but does not replicate every Obsidian editing feature:

- **Link suggestions**: typing `[[` does not suggest your notes — type the full link manually
- **Inline plugin calls**: inline Dataview queries (`= this.file.name`) and Templater commands (`<% tp.date.now() %>`) do not execute inside frames
- **Desktop only**: boards are not available on mobile — your notes remain readable as standard Markdown on mobile

---

## 🚀 Installation

**Requirements**: Obsidian desktop ≥ 0.15.0. Compatible with Obsidian 1.13.0 (Catalyst) and later.

### Option 1 — BRAT (Recommended)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) handles automatic updates:

1. Install and enable the **BRAT** community plugin
2. In BRAT settings, add `a198h/agile-board`
3. BRAT installs the plugin and keeps it up to date automatically

### Option 2 — Manual Installation

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest GitHub release](https://github.com/a198h/agile-board/releases/latest)
2. Copy the three files to `.obsidian/plugins/agile-board/`
3. Restart Obsidian and enable **Agile Board** in Settings → Community plugins

> **5 default layouts are bundled** with the plugin — no additional download required.

---

## 📝 Quick Start

### 1. Activate a layout on a note

Add the `agile-board` property to the note's frontmatter:

```yaml
---
agile-board: eisenhower
---
```

Click the 🏢 icon in the toolbar to switch to Board mode.

### 2. Available layouts

| Layout | Description |
|---|---|
| `eisenhower` | Important / Urgent 4-quadrant matrix |
| `swot` | Strengths, Weaknesses, Opportunities, Threats |
| `moscow` | Must / Should / Could / Won't prioritization |
| `effort_impact` | Action prioritization by effectiveness |
| `cornell` | Active note-taking system |

### 3. Edit a frame

- **Single click** → edit mode
- **Double-click the title** → open in popout window
- Changes are saved to the Markdown file automatically

---

## ⚙️ Plugin Settings

Open **Settings → Community plugins → Agile Board** to manage layouts and appearance.

![Agile Board – Config](./agile-board-customize-board.png)

### Layout Management

Each layout is a `.json` file in the plugin's `layouts/` folder. From the settings panel:

| Action | Control |
|---|---|
| Create | ➕ button — enter a name |
| Edit | ✏️ icon — opens the visual editor |
| Duplicate | 📑 icon |
| Export / Import | ⬆️ / ⬇️ icons — share or load configurations |
| Delete | 🗑️ icon |

### Visual Layout Editor

The editor shows a **24×24 grid** where you place and resize **boxes** (frames):

- **Create**: click and drag on an empty area
- **Move**: drag a box to reposition it
- **Resize**: drag the circular handles at the box corners and edges
- **Rename**: edit the title in the side panel
- **Color**: pick a custom color from the side panel — click **Reset** to revert to the palette color
- **Delete**: 🗑️ button in the side panel
- **Clear all**: removes all boxes from the layout (with confirmation)

Each box maps to a **level-1 heading** (`#`) in the note and the content that follows it.

---

## 🌍 Multilingual Support

The interface automatically adapts to your Obsidian language. All UI elements, settings, messages and tooltips are available in **7 languages** (96 translation keys):

| Language | Status |
|---|---|
| 🇺🇸 English | reference |
| 🇫🇷 Français | complete |
| 🇪🇸 Español | complete |
| 🇩🇪 Deutsch | complete |
| 🇵🇹 Português | complete |
| 🇨🇳 中文 (简体) | complete |
| 🇷🇺 Русский | complete |

---

## 💡 Inspiration

This plugin is inspired by [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) and builds on the idea of transforming Markdown notes into visual layouts.

---

## 📂 Contributing & Support

- **Bug reports & feature requests**: [GitHub Issues](https://github.com/a198h/agile-board/issues)
- **Discussions**: [GitHub Discussions](https://github.com/a198h/agile-board/discussions/8)

If you find this plugin useful, consider supporting development:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)
