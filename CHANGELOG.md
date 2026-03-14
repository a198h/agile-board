# Changelog

All notable changes to the Agile Board plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-03-14

### ✨ New Features

- **Popout editor**: Double-click on a frame title to open its content in a separate window with full Live Preview editing. Content is synced back to the original note when the window is closed. Locked frames cannot be opened in popout.

### 🔧 Improvements

- **Font size slider**: Minimum font scale lowered from 0.8x to 0.7x for better readability in small frames.

### 🐛 Bug Fixes

- **Auto-switch during editing (fixes #20)**: Fixed issue where editing a frame in board view would automatically switch back to markdown view after a few seconds on some environments (Linux/KDE/Wayland). Thanks to @Reaper176 for reporting and contributing the fix.

## [0.8.9] - 2026-02-16

### ✨ New Features

- **Frame lock button**: Lock/unlock button on each frame's title bar to prevent accidental editing. Links, embeds, and checkboxes remain interactive when locked. Lock state persists across sessions and follows file renames/deletions.
- **Font size slider**: Global font size setting (0.8x–1.5x scale) in plugin settings, applied live to all board frames via CSS custom property.
- **Board context menu**: Full context menu (`onPaneMenu`) for the Board view with all standard Obsidian options — switch to Live Preview/Source mode, split right/down, open in new window, rename, move, bookmark, print board, copy path, reveal in explorer, delete file.
- **Print board**: Print the board layout directly from the context menu. Embedded content (Bases) is not included in the print output.

### 🔧 Improvements

- **Settings reorganization**: Plugin settings tab reorganized into two sections — Appearance (font size) and Library (layout management).
- **Settings persistence**: New plugin settings infrastructure using Obsidian's `loadData`/`saveData`.
- **i18n**: Added translation keys for all new features in all 7 locales (EN, FR, ES, DE, PT, ZH-CN, RU).

## [0.8.8] - 2026-02-12

### 🐛 Bug Fixes

- **Pinned tabs duplication**: Fixed critical bug where clicking on pinned tabs created duplicate empty tabs when the plugin was active. Replaced all `workspace.getLeaf(false)` calls with `workspace.activeLeaf` to work around a known Obsidian API issue.
- **Dataview/Tasks font styling**: Queries from Dataview and Tasks plugins now properly inherit system font settings (font-family, font-size). Added standard Obsidian CSS classes (`markdown-preview-view`, `markdown-rendered`) to the preview container.
- **Board viewport height**: The board now fits exactly within Obsidian's available viewport, eliminating unwanted global scrolling. Individual frames retain their scroll capability when content overflows.
- **Embed-only frames**: Fixed frames containing only embeds being unclickable/inactive.
- **TypeScript compliance**: Fixed `onUnloadFile()` signature to properly return `Promise<void>`.

### 📝 Documentation

- Updated all 7 README files with version 0.8.8
- Reorganized installation options: BRAT first (recommended), manual installation second
- Removed obsolete "Complete Vault" installation option

## [0.8.0] - 2025-10-30

### ✨ Major Features

- **📎 Embed Preview Support**: Full support for embedded content in Board mode
  - **Images**: `![[image.png]]` displays correctly in preview mode
  - **Notes**: `![[other-note.md]]` renders note content with full markdown
  - **Obsidian Bases**: `![[table.base]]` displays interactive database views
  - **Persistent View Selection**: Use `![[table.base#ViewName]]` syntax for persistent base views

### 🌍 Internationalization

- **🇷🇺 Russian Language Support**: Complete Russian translation added (7 languages total)
- **📋 Layout Translations**: All 5 default layouts now have complete translations in all languages
  - Display names and descriptions translated
  - Box/frame titles translated for each layout
  - Languages: English, French, Spanish, German, Portuguese, Chinese (Simplified), Russian

### 🔧 Technical Improvements

- **CodeMirror 6 Integration**: Full migration to CodeMirror 6 for frame editing
  - Better performance and stability
  - Native Obsidian Live Preview features integration
  - Improved markdown rendering in edit mode
- **Post-processing System**: Smart embed rendering in preview mode
  - Detects `<span class="internal-embed">` and replaces with visual content
  - Supports fragment syntax for persistent views (`#ViewName`)
- **Interactive Elements**: Proper handling of clickable elements in bases
  - Base menus, toolbars, and buttons work correctly
  - No accidental editor triggering on interactive clicks

### 🐛 Bug Fixes

- **Closes #18**: Complete layout translations for all supported languages
- **Callout Display**: Fixed overflow issue causing callouts to be cut off after editing
- **Base Fragment Support**: Fixed `![[file.base#View]]` syntax to properly resolve files and pass fragments
- **Edit/Preview Mode**: Source text displays correctly in edit mode, embeds in preview mode

### 🧹 Code Quality

- **Removed Dead Code**: Deleted 187 lines of unused `EmbedPreviewPlugin` code
- **Clean Architecture**: Clear separation between edit mode (source text) and preview mode (visual embeds)
- **Documentation**: Updated all 7 README files with embed support documentation

### 📝 Documentation

- **README Updates**: All language versions updated with:
  - CodeMirror 6 integration status
  - Embed preview support documentation
  - Persistent view selection syntax for Bases
- **Russian README**: Complete translation of all documentation
- **Current Limitations**: Updated to reflect new capabilities

## [0.7.8] - 2025-09-22

### Added
- **✨ Enhanced Markdown Formatting**: Comprehensive support for markdown elements in frames
  - Horizontal lines support (---, ***, ___) with proper regex handling
  - Code blocks rendering with triple backticks (```) and theme-compliant styling
  - Automatic callout line continuation (>) in markdown editor
  - Enhanced fallback HTML parser with full markdown support

### Fixed
- **🔗 Tasks Plugin Integration**: Resolved bug where clicking Tasks plugin link icon (🔗) created files instead of navigating to task sources
- **🎨 Code Block Styling**: Added Obsidian theme-compliant styling for code blocks with proper background colors and borders
- **📋 Copy Button Fix**: Fixed copy button positioning and event propagation in code blocks to prevent frame editor interference
- **📝 Callout Continuation**: Fixed callout line continuation to use simple ">" instead of repeating full callout types

### Technical
- Improved LinkHandler to filter out Tasks plugin control elements
- Enhanced MarkdownRenderer with comprehensive markdown parsing
- Added event handling fixes for copy buttons in code blocks
- Optimized markdown editor with smart line continuation for callouts

## [0.7.7] - 2025-09-17
- **Full internationalization** : English, French, German, Spanish, Portuguese, Chinese

## [0.7.6] - 2025-09-16

### Fixed
- **🔧 Bundled Layouts**: Fixed layouts loading issue in v0.7.5 where layouts were not properly bundled
- **📦 BRAT Compatibility**: Replaced dynamic imports with static imports for JSON layouts
- **⚙️ TypeScript Config**: Added `resolveJsonModule` and `allowSyntheticDefaultImports` for proper JSON handling
- **🐛 Layout Loading Error**: Resolved "Layout 'swot' introuvable (disponibles: )" error in BRAT installations

### Technical
- Static imports replace dynamic imports: `import eisenhowerData from "../../layouts/eisenhower.json"`
- Layouts now truly embedded in main.js bundle
- No more external layouts.zip dependency needed

## [0.7.5] - 2025-09-16

### Added
- **🗑️ Clear All Boxes**: New button to delete all boxes from a layout with confirmation dialog
- **📐 Minimum Box Size**: Boxes now have a minimum size of 2x2 cells (prevents unusable 1x1 boxes)
- **🔧 Performance Optimizations**: Lazy loading system for layouts reduces plugin startup time by 60-80%
- **📦 Bundled Default Layouts**: 5 layouts now included directly in plugin (eisenhower, swot, moscow, effort_impact, cornell)

### Fixed
- **🐛 Metadata Resolution**: Fixed "undefined file" error in metadata resolution process
- **🧹 Clean Logging**: Replaced all console.log with contextual logging system for production-ready code
- **⚡ Load Time**: Optimized plugin initialization with lazy loading patterns

### Changed
- **🏗️ Architecture**: Improved code structure following SOLID principles
- **📝 Documentation**: Enhanced JSDoc comments and code documentation
- **🌐 Manifest**: Updated description and funding information for community submission
- **🔒 Security**: Removed external download dependencies, fully compliant with Obsidian guidelines

### Technical Details
- Layouts are now bundled with the plugin instead of downloaded from external sources
- Lazy loading implementation reduces initial memory footprint
- Enhanced error handling with Result<T, Error> patterns
- Professional logging system with contextual information

## [0.7.2] - 2025-09-03

### Added
- **📥 Automatic Layout Download**: Layouts now download automatically on first startup
- **🔄 Layout Hot-reload**: File watching system for custom layouts
- **🎯 BRAT Compatibility**: Seamless integration with BRAT plugin manager

### Fixed
- **🐛 Layout Loading**: Improved reliability of layout file loading
- **⚡ Performance**: Optimized layout validation and collision detection

### Technical Details
- Introduced LayoutDownloader service (later deprecated in v0.7.3)
- Enhanced layout file repository management
- Improved error handling for missing layouts

## [0.7.1] - 2025-09-03

### Fixed
- **🐛 Critical Fixes**: Various stability improvements
- **🔧 Bug Fixes**: Resolution of editor and rendering issues

## [0.7.0] - 2025-08-31

### Added
- **🎨 Visual Layout Editor**: Complete redesign with modular architecture
- **📐 24x24 Grid System**: Professional grid-based layout design
- **🎛️ Advanced Controls**: Drag, resize, and create operations with visual feedback
- **📊 Selection Management**: Multi-selection and group operations
- **🔧 Professional Sidebar**: Comprehensive layout management interface

### Changed
- **🏗️ Modular Architecture**: Complete refactoring following enterprise-grade patterns
- **💾 Immutable State**: All data structures now use readonly modifiers
- **🎯 Dependency Injection**: Clean separation of concerns across all components
- **📋 Type Safety**: Enhanced TypeScript integration with strict typing

### Technical Details
- Introduced LayoutEditor, GridCanvas, BoxManager, DragDropHandler, and SelectionManager
- SOLID principles implementation throughout the codebase
- Event-driven architecture for component communication

## [0.6.0] - 2025-07-26

### Added
- **📝 Live Preview Integration**: Enhanced markdown rendering within frames
- **✅ Smart Task Handling**: Clickable checkboxes with automatic synchronization
- **🔗 Plugin Compatibility**: Improved support for Dataview, Tasks, and other popular plugins

### Fixed
- **🎯 Rendering Issues**: Improved frame content display and editing experience
- **📱 UI/UX Improvements**: Better visual feedback and user interaction

## [0.5.6] - 2025-07-26

### Fixed
- **🐛 Stability Improvements**: Various bug fixes and performance enhancements
- **🔧 Editor Reliability**: Enhanced inline editing experience

## [0.5.1] - 2025-07-19

### Added
- **🎪 Frame Editing**: Click-to-edit functionality for layout frames
- **📝 Markdown Support**: Rich markdown rendering within frames
- **🔄 Real-time Sync**: Automatic synchronization between visual frames and markdown source

## [0.5.0] - 2025-07-19

### Added
- **🎨 Layout System**: Introduction of customizable layout templates
- **📋 Default Layouts**: Eisenhower matrix, SWOT analysis, and other productivity templates
- **🏢 Board Mode**: Visual board interface with editable frames
- **⚙️ Settings Panel**: Layout management interface in Obsidian settings

### Changed
- **🔄 Dual Mode System**: Switch between Board mode and Normal markdown editing
- **📦 Frontmatter Activation**: Layouts activated via `agile-board: layout_name` property

## [0.3.2] - 2025-06-24

### Fixed
- **🐛 Initial Bug Fixes**: Various stability and compatibility improvements

## [0.3.0] - 2025-06-23

### Added
- **🎯 Core Concept**: Initial implementation of visual board transformation
- **📝 Markdown Integration**: Basic markdown note to visual board conversion
- **🔧 Foundation**: Core plugin architecture and Obsidian API integration

---

## Version Support

- **Current Version**: 0.9.0
- **Minimum Obsidian Version**: 0.15.0
- **Platform Support**: Desktop only (`isDesktopOnly: true`)
- **License**: GPL-3.0

## Inspiration

This plugin is inspired by [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) and builds upon the concept of transforming markdown notes into visual layouts.

## Contributing

See our [contribution guidelines](https://github.com/a198h/agile-board/issues) for bug reports and feature requests.

## Support

If you find this plugin useful, consider supporting the development:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)