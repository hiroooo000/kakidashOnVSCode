# Kakidash VS Code Extension アーキテクチャ

## 1. アーキテクチャ概要

本拡張機能は、マインドマップを可視化・編集するために `kakidash` ライブラリを統合した VS Code の **カスタムエディタ** です。アーキテクチャは、**Extension Host** (Node.js 環境) と **Webview** (ブラウザ環境) の厳格な分離に基づいています。

### 1.1 アーキテクチャ図

```mermaid
graph TD
    subgraph ExtensionHost ["Extension Host (Node.js)"]
        Extension[Extension Entry]
        Panel[MindMapPanel]
        FileSystem[VS Code FileSystem]
    end

    subgraph Webview ["Webview (Browser)"]
        Main[main.ts]
        App[MindMapApp]
        Kakidash[Kakidash Library]
    end

    Extension -->|登録| Panel
    
    Panel -->|初期化| Main
    Panel <-->|メッセージ通信| Main
    
    Main -->|インスタンス化| App
    App -->|利用| Kakidash
    
    Panel -->|読み書き| FileSystem
```

### 1.2 責務の分離

- **Extension Host**: ライフサイクル管理、ファイル I/O 操作、VS Code API (コマンド、設定) との連携を担当します。カスタムエディタの「バックエンド」として機能します。
- **Webview**: UI のレンダリングとエディタ内でのユーザー操作を担当します。サンドボックス化されたブラウザ環境で `kakidash` ライブラリを実行します。

## 2. ディレクトリ構造

ソースコードは、Extension Host と Webview の分離を反映するように構成されています。

```
src/
├── extension.ts      # 拡張機能のエントリーポイント (拡張機能の有効化)
├── panels/           # Extension Host で動作するコード
│   ├── MindMapPanel.ts # カスタムエディタのロジック & メッセージハンドリング
│   └── getNonce.ts     # Content Security Policy 用のセキュリティユーティリティ
└── webview/          # Webview で動作するコード
    ├── main.ts         # Webview のエントリーポイント
    └── MindMapApp.ts   # Webview と Kakidash のブリッジ
```

## 3. コンポーネント詳細

### 3.1 Extension Host コンポーネント

#### `MindMapPanel` (`src/panels/MindMapPanel.ts`)
`vscode.CustomTextEditorProvider` を実装するコアクラスです。
- **責務**:
  - カスタムエディタの解決 (Resolve)。
  - Webview 用の HTML コンテンツの生成。
  - メッセージチャンネル (`webview.onDidReceiveMessage`) のセットアップ。
  - VS Code ドキュメントモデルと Webview 状態の同期。
- **主要メソッド**:
  - `resolveCustomTextEditor`: ユーザーがファイルを開いたときに呼び出されます。
  - `_updateWebview`: ドキュメントの内容を Webview に送信します。
  - `_getHtmlForWebview`: スクリプト URI を含む HTML 文字列を構築します。

### 3.2 Webview コンポーネント

#### `MindMapApp` (`src/webview/MindMapApp.ts`)
ブラウザコンテキスト内の主要なアプリケーションロジックです。
- **責務**:
  - `Kakidash` インスタンスの初期化。
  - `kakidash` イベント (モデルの変更など) の購読と Extension Host への通知。
  - Extension Host からのメッセージ (例: `update` コマンド) の処理。
  - Webview 内でのキーボードフォーカスとショートカットの管理。

#### `Kakidash` (Core Library)
マインドマップの実際のレンダリングとインタインタラクションを担当する外部ライブラリです。本拡張機能はこのライブラリをラップして、VS Code 環境に適応させています。

## 4. 主なデータフロー

### 4.1 ファイルオープン時

```mermaid
sequenceDiagram
    participant VSCode as VS Code Core
    participant Panel as MindMapPanel
    participant Webview as Webview (App)
    participant Kakidash

    VSCode->>Panel: resolveCustomTextEditor(document)
    Panel->>VSCode: HTML コンテンツを設定
    VSCode->>Webview: スクリプト読み込み (main.ts)
    Webview->>Webview: MindMapApp を初期化
    Panel->>Webview: postMessage({ type: 'update', text: docContent })
    Webview->>Kakidash: new Kakidash(container, options)
    Kakidash->>Kakidash: マインドマップを描画
```

### 4.2 編集と保存

このフローにより、UI での変更が VS Code のドキュメントモデルに反映され、実際のファイル保存処理が行われます。

```mermaid
sequenceDiagram
    participant User
    participant Kakidash
    participant App as MindMapApp
    participant Panel as MindMapPanel
    participant Doc as VS Code Document

    User->>Kakidash: ノードの追加/編集
    Kakidash->>App: Event 'model:change'
    App->>Panel: postMessage({ type: 'change', text: jsonString })
    Panel->>Doc: edit() 適用
    
    Note right of Doc: ドキュメントが "Dirty" (未保存) になる
    
    User->>VSCode: 保存 (Ctrl+S)
    VSCode->>Doc: ディスクへの書き込み
```
