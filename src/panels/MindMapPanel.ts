import * as vscode from 'vscode';

export class MindMapPanel implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new MindMapPanel(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(MindMapPanel.viewType, provider);
        return providerRegistration;
    }

    private static readonly viewType = 'kakidash.mindmap';

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {

        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'node_modules'),
                vscode.Uri.joinPath(this.context.extensionUri, 'dist'), // For other assets if needed
            ]
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

        // Listen for changes to the document (though we are focused on read-only for now or initial load)
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                webviewPanel.webview.postMessage({
                    type: 'update',
                    text: document.getText(),
                });
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }

    private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'kakidash', 'dist', 'kakidash.umd.js'));

        const text = document.getText();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Kakidash Mindmap</title>
                <style>
                    body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background-color: white; }
                    #mindmap-container { width: 100%; height: 100%; }
                </style>
                <script src="${scriptUri}"></script>
            </head>
            <body>
                <div id="mindmap-container"></div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    const container = document.getElementById('mindmap-container');
                    let board;

                    // Parse content safely
                    let initialContent = null;
                    try {
                        const rawText = ${JSON.stringify(text)};
                        if (rawText.trim()) {
                            initialContent = JSON.parse(rawText);
                        }
                    } catch (e) {
                        console.error('Failed to parse initial content', e);
                        // Maybe initialize empty or show error? 
                        // For now we pass null or empty object if library supports it, or let it handle it.
                    }

                    if (window.kakidash) {
                        const { Kakidash } = window.kakidash;
                        board = new Kakidash(container);
                        
                        if (initialContent) {
                            board.loadData(initialContent);
                        } else {
                            // Initialize with a root node if empty
                            // board.addNode(board.getRootId(), 'Root'); // If library supports this or has default
                            // Docs say: board.addNode(board.getRootId(), 'Hello World');
                            // But we need to know what getRootId() returns for a fresh board.
                            // Assuming empty board might need some init.
                            // Let's rely on loadData or user interaction for now.
                        }
                    } else {
                        container.innerText = 'Kakidash library (window.kakidash) not found.';
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'update':
                                try {
                                    const data = JSON.parse(message.text);
                                    if (board) {
                                        board.loadData(data);
                                    }
                                } catch (e) {
                                    console.error('Failed to parse update', e);
                                }
                                return;
                        }
                    });
                </script>
            </body>
        `;
    }
}
