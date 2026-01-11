import * as vscode from 'vscode';
import { getNonce } from './getNonce';

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
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Initial content
        const textStr = document.getText();

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();

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
            </head>
            <body>
                <div id="mindmap-container"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
                <script nonce="${nonce}">
                    // Initialize with data
                    window.postMessage({ type: 'update', text: ${JSON.stringify(textStr)} }, '*');
                </script>
            </body>
        `;
    }
}
