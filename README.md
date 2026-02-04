# Kakidash VSCode Extension

Mindmap viewer and editor using [kakidash](https://github.com/hiroooo000/kakidash).

## Features

- View and edit `.mm` and `.mindmap` files.
- Keyboard driven mindmap editing.
- Image support.
+
+## Architecture
+
+Details of the software architecture can be found here:
+- [English](docs/architecture.md)
+- [Japanese](docs/architecture_ja.md)

## Shortcuts

### General
| Key | Description |
| --- | --- |
| `Arrow Keys` | Navigate between nodes |
| `h` / `j` / `k` / `l` | Navigate between nodes (Vim-style) |
| `F2` / `DblClick` / `Space` | Start editing node (Space triggers zoom if image) |
| `Enter` | Add sibling node (below) |
| `Shift + Enter` | Add sibling node (above) |
| `Tab` | Add child node |
| `Shift + Tab` | Insert parent node |
| `Delete` / `Backspace` | Delete node |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + X` | Cut |
| `Ctrl/Cmd + V` | Paste (Images supported) |
| `Drag` (Canvas) | Pan screen |
| `Wheel` | Vertical scroll (Pan) |
| `Shift + Wheel` | Horizontal scroll (Pan) |
| `Ctrl/Cmd + Wheel` | Zoom in/out |

### Editing (Text Input)
| Key | Description |
| --- | --- |
| `Enter` | Confirm edit |
| `Shift + Enter` | New line |
| `Esc` | Cancel edit |

### Styling (Since selection)
| Key | Description |
| --- | --- |
| `b` | Toggle Bold |
| `i` | Toggle Italic |
| `+` | Increase font size |
| `-` | Decrease font size |
| `1` - `7` | Change node color (Palette order) |

## Configuration

You can customize the appearance of the mindmap via VS Code settings (`Ctrl+,` and search for "kakidash").

- **Canvas Background**: `kakidash.style.canvas.background`
- **Root Node**: Customize background, text color, border style, width, and color.
- **Child Node**: Customize background, text color, border style, width, and color.
- **Connection**: Customize connection color.

## Development

This project uses [pnpm](https://pnpm.io/) and [Turbo](https://turbo.build/).

### Setup

```bash
npm install -g pnpm
pnpm install
```

### Build & Test

```bash
pnpm turbo run build test lint
```

### Package

```bash
pnpm turbo run package
```
