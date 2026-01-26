# Kakidash VSCode Extension

[kakidash](https://github.com/hiroooo000/kakidash) を使用したマインドマップ閲覧・編集拡張機能です。

## 機能

- `.mm` および `.mindmap` ファイルの閲覧と編集
- キーボード操作による高速なマインドマップ編集
- 画像の貼り付け対応

## ショートカット一覧

### 全般
| キー | 説明 |
| --- | --- |
| `Arrow Keys` | ノード間の移動 |
| `h` / `j` / `k` / `l` | ノード間の移動 (Vim風) |
| `F2` / `DblClick` / `Space` | ノードの編集を開始 (画像の場合はズーム) |
| `Enter` | 兄弟ノードを追加 (下) |
| `Shift + Enter` | 兄弟ノードを追加 (上) |
| `Tab` | 子ノードを追加 |
| `Shift + Tab` | 親ノードを挿入 |
| `Delete` / `Backspace` | ノードを削除 |
| `Ctrl/Cmd + Z` | 元に戻す (Undo) |
| `Ctrl/Cmd + C` | コピー |
| `Ctrl/Cmd + X` | 切り取り |
| `Ctrl/Cmd + V` | 貼り付け (画像も可) |
| `Drag` (Canvas) | 画面のパン (移動) |
| `Wheel` | 上下スクロール (パン) |
| `Shift + Wheel` | 左右スクロール (パン) |
| `Ctrl/Cmd + Wheel` | ズームイン/アウト |

### 編集 (テキスト入力中)
| キー | 説明 |
| --- | --- |
| `Enter` | 編集を確定 |
| `Shift + Enter` | 改行 |
| `Esc` | 編集をキャンセル |

### スタイル (ノード選択時)
| キー | 説明 |
| --- | --- |
| `b` | 太字 (Bold) 切り替え |
| `i` | 斜体 (Italic) 切り替え |
| `+` | フォントサイズ拡大 |
| `-` | フォントサイズ縮小 |
| `1` - `7` | ノードの色を変更 (パレット順) |

## 開発

このプロジェクトでは [pnpm](https://pnpm.io/) と [Turbo](https://turbo.build/) を使用しています。

### セットアップ

```bash
npm install -g pnpm
pnpm install
```

### ビルドとテスト

```bash
pnpm turbo run build test lint
```

### パッケージング

```bash
pnpm turbo run package
```
