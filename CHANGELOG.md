# Changelog

## [0.4.0] - 2026-04-26

### Added
- Hybrid image storage support (original images are stored as separate files `.img_*.png`)
- Thumbnail optimization (automatically reduce base64 image size for preview)
- New Kakidash APIs: `getImages()`, `gcImages()`, `zoomNode()`

### Changed
- Update kakidash library to v0.4.0

### Fixed
- Prevented image corruption during file saving and synchronization

## [0.0.11] - 2026-03-17

### Added
- Added strikethrough shortcut `s`

### Changed
- Update kakidash to 0.3.2
  - Support strikethrough text style
  - Migrate to pointer events for touch support
  - Improve drag sensitivity with distance-based threshold
  - Fix clipboard paste issues and markdown export dialog
  - Significant architectural refactoring (InteractionOrchestrator, CommandBus, etc.)

## [0.0.10] - 2026-02-22

### Changed
- Update kakidash to 0.2.3

## [0.0.9] - 2026-02-15

### Added
- Use document filename as default export filename

### Changed
- Update kakidash to 0.2.2

### Added
- Implement file import/export functionality using kakidash 0.2.2 FileHandler interface
- Add support for XMind file import
- Add support for PNG, SVG, and Markdown export

## [0.0.8] - 2026-02-12

### Changed
- Update kakidash to 0.2.1

## [0.0.7] - 2026-02-07

### Changed
- Update kakidash to 0.2.0
- Add publish step to release workflow

## [0.0.6] - 2026-02-05

### Changed
- Update kakidash to 0.1.13

## [0.0.5] - 2026-01-29

### Changed
- Update kakidash to 0.1.2
## [0.0.4] - 2026-01-26

### Changed
- Update kakidash to 0.1.0
- Migrate to pnpm and turbo repository structure
- Update devcontainer configuration

### Fixed
- Fix pnpm-lock.yaml mismatch issues
