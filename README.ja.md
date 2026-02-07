# Kakidash VSCode Extension

[kakidash](https://github.com/hiroooo000/kakidash) を使用したマインドマップ閲覧・編集拡張機能です。

## 機能

- `.mm` および `.mindmap` ファイルの閲覧と編集
- キーボード操作による高速なマインドマップ編集
- 画像の貼り付け対応

## アーキテクチャ

詳細なソフトウェアアーキテクチャ定義書は以下を参照してください。
- [英語版](docs/architecture.md)
- [日本語版](docs/architecture_ja.md)

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

## 設定

VS Codeの設定 (`Ctrl+,`) からマインドマップの見た目をカスタマイズできます ("kakidash" で検索)。

- **キャンバス背景**: `kakidash.style.canvas.background`
- **ルートノード**: 背景色、文字色、枠線のスタイル・太さ・色を個別に設定可能。
- **子ノード**: 背景色、文字色、枠線のスタイル・太さ・色を個別に設定可能。
- **コネクション**: 線の色を設定可能。

## 開発

このプロジェクトでは [npm](https://www.npmjs.com/) と [Turbo](https://turbo.build/) を使用しています。

### セットアップ

```bash
npm install
```

### ビルドとテスト

```bash
npm run turbo:ci
```

### パッケージング

```bash
npm run turbo:package
```
