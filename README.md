![version](https://img.shields.io/badge/version-0.7.7-blue)

🌍 Read this in other languages: 
[Français](README.fr.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [简体中文](README.zh-CN.md)

---

# Agile Board

**Agile Board** is a plugin for [Obsidian](https://obsidian.md) that transforms your notes into visual boards. Each layout is based on a template (like the Eisenhower matrix) defined on a 24x24 grid. Sections appear as editable frames ("boxes"): you can write, insert tasks, Dataview/Tasks queries, etc.

**Note**: Content is always saved in classic Markdown under # headings, which ensures compatibility with all your notes.

---

## 🎯 Features

Transform your notes into visual dashboards with editable frames. Each frame represents a section (level 1 heading) with support for:

- **Rich Markdown**: `[[links]]`, `- [ ] tasks`, formatting
- **Smart editing**: auto-continued lists, clickable checkboxes
- **Plugin compatibility**: Dataview, Tasks, etc.
- **Live Preview**: rendering close to Obsidian with some limitations

## 🌍 Multilingual Support

**NEW in v0.7.7**: Complete internationalization with **automatic language detection**!

- 🇺🇸 **English** - reference language
- 🇫🇷 **Français** - traduction complète
- 🇪🇸 **Español** - traducción completa  
- 🇩🇪 **Deutsch** - vollständige Übersetzung
- 🇵🇹 **Português** - tradução completa
- 🇨🇳 **中文 (简体)** - 完整翻译

The interface automatically adapts to your Obsidian language setting. All UI elements, settings, messages, and tooltips are professionally translated with **96 translation keys** across all languages.

## ⚠️ Current Limitations

The Board mode uses a simplified editor that doesn't include all of Obsidian's advanced editing features:

- **Images**: Pictures inserted with `![[image.png]]` won't display in Board mode frames
- **Link suggestions**: When typing `[[`, the editor won't suggest your notes (you can still type the full link manually)
- **Inline plugin calls**: Inline Dataview queries (`= this.file.name`) or Templater commands (`<% tp.date.now() %>`) don't execute in frames

**Future plans**: We aim to integrate CodeMirror 6 (Obsidian's native editor) to resolve these limitations. If you have experience with CM6 integration, your contribution would be very welcome!


## 🔄 Two display modes

**🏢 Board Mode**: Grid of editable frames with Live Preview features  
**📄 Normal Mode**: Classic Obsidian markdown editing

Switch between modes via the toolbar icons.

![Agile Board – Eisenhower Example](./agile-board-eisenhower.gif)

---

## 🚀 Installation

### Option 1 - Complete Vault (recommended)

1. Download `Agile-Board-v0.7.7.zip` (Obsidian vault with plugin and examples)
2. Unzip and open the folder directly in Obsidian

### Option 2 - Plugin only

1. Download from [GitHub releases](https://github.com/a198h/agile-board/releases)
2. Copy the `agile-board` folder to `.obsidian/plugins/`
3. Restart Obsidian and enable the plugin
4. **5 default layouts are included** directly in the plugin

### Option 3 - BRAT (Beta Testing)

Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat) to get the latest updates:

1. Install and enable the BRAT plugin
2. Add `a198h/agile-board` as a beta plugin
3. BRAT will automatically update the plugin

---

## 📝 Usage

### Configuration

To enable a layout on a note, add this line to the properties (frontmatter):

```yaml
---
agile-board: eisenhower
---
```

**Available layouts** (provided by default):

- `eisenhower`: 4-quadrant important/urgent matrix
- `swot`: Analyze a situation
- `moscow`: Prioritize features or needs (Must/Should/Could/Won't)
- `effort_impact`: Decide which actions to take based on their effectiveness
- `cornell`: Active note-taking

The 🏢 icon appears in the toolbar. Click to switch to Board mode.

### Editing

- **Click on a frame** → Edit mode
- **Smart lists**: Bullet lists and numbered lists
- **Checkboxes**: Click to check/uncheck, automatic sync
- **Queries**: Query, Dataview, Tasks

---

## ⚙️ Plugin Settings

From the **Settings → Community plugins → Agile Board** panel, you can manage your layouts directly from Obsidian.

![Agile Board – Config](./agile-board-customize-board.png)

### 📋 Layout Management

The list of available layouts appears automatically in the settings. Each layout corresponds to a `.json` file saved in the plugin's `layouts` folder (users don't need to manipulate this folder).

- **Create a layout**: ➕ button, enter a name.
- **Edit a layout**: ✏️ icon opens the visual editor.
- **Duplicate a layout**: 📑 icon.
- **Export / Import**: ⬆️ and ⬇️ icons to share or load a configuration.
- **Delete a layout**: 🗑️ icon.

### 🎨 Visual Editor

The layout editor displays a **24×24** grid on which you can place **boxes** (frames):

- **Create**: click and drag on the grid.
- **Move**: drag a box.
- **Resize**: use the circular handles.
- **Rename**: modify the title in the side panel.
- **Delete**: red "🗑️" button.
- **Clear All**: red "🗑️ Clear all boxes" button below the help section.

Each box corresponds to a **note section**: a **level 1** heading (line starting with `#`) followed by its content.

---

## ✨ Features

- **Automatic synchronization**: Changes in visual frames are automatically saved to the markdown file
- **Automatic sections**: Assisted creation of missing sections
- **Plugin compatibility**: Dataview, Tasks and Templater seem to work normally (report bugs!); other plugins to be verified.

---

## 💡 Inspiration

This plugin is inspired by [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) and builds upon the concept of transforming markdown notes into visual layouts.

---

## 📂 Your contribution matters!

- **Bugs/Issues**: [https://github.com/a198h/agile-board/issues](https://github.com/a198h/agile-board/issues)
- **Discussions**: [https://github.com/a198h/agile-board/discussions/8](https://github.com/a198h/agile-board/discussions/8)


## Support me
If you find my work useful, you can support me here: 
[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)