# Changelog

All notable changes to the Agile Board plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for v0.8.0
- Implement onClearAll event for better architecture
- CodeMirror 6 integration with full image support (`![[image.png]]`) in frames

## [0.7.5] - 2025-01-15

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

## [0.7.2] - 2025-01-10

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

## [0.7.1] - 2025-01-05

### Fixed
- **🐛 Critical Fixes**: Various stability improvements
- **🔧 Bug Fixes**: Resolution of editor and rendering issues

## [0.7.0] - 2025-01-01

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

## [0.6.0] - 2024-12-15

### Added
- **📝 Live Preview Integration**: Enhanced markdown rendering within frames
- **✅ Smart Task Handling**: Clickable checkboxes with automatic synchronization
- **🔗 Plugin Compatibility**: Improved support for Dataview, Tasks, and other popular plugins

### Fixed
- **🎯 Rendering Issues**: Improved frame content display and editing experience
- **📱 UI/UX Improvements**: Better visual feedback and user interaction

## [0.5.6] - 2024-12-10

### Fixed
- **🐛 Stability Improvements**: Various bug fixes and performance enhancements
- **🔧 Editor Reliability**: Enhanced inline editing experience

## [0.5.1] - 2024-12-05

### Added
- **🎪 Frame Editing**: Click-to-edit functionality for layout frames
- **📝 Markdown Support**: Rich markdown rendering within frames
- **🔄 Real-time Sync**: Automatic synchronization between visual frames and markdown source

## [0.5.0] - 2024-12-01

### Added
- **🎨 Layout System**: Introduction of customizable layout templates
- **📋 Default Layouts**: Eisenhower matrix, SWOT analysis, and other productivity templates
- **🏢 Board Mode**: Visual board interface with editable frames
- **⚙️ Settings Panel**: Layout management interface in Obsidian settings

### Changed
- **🔄 Dual Mode System**: Switch between Board mode and Normal markdown editing
- **📦 Frontmatter Activation**: Layouts activated via `agile-board: layout_name` property

## [0.3.2] - 2024-11-20

### Fixed
- **🐛 Initial Bug Fixes**: Various stability and compatibility improvements

## [0.3.0] - 2024-11-15

### Added
- **🎯 Core Concept**: Initial implementation of visual board transformation
- **📝 Markdown Integration**: Basic markdown note to visual board conversion
- **🔧 Foundation**: Core plugin architecture and Obsidian API integration

---

## Version Support

- **Current Version**: 0.7.5
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