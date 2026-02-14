import * as vscode from 'vscode';
import { getNonce } from './getNonce';
import { getKakidashStyles } from '../Configuration';

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

        let isFromWebview = false;

        // Listen for changes to the document (though we are focused on read-only for now or initial load)
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                if (isFromWebview) {
                    return;
                }
                this.updateWebview(webviewPanel.webview, document.getText());
            }
        });

        // Listen for configuration changes
        const changeConfigurationSubscription = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('kakidash.nodeWidth') || e.affectsConfiguration('kakidash.style')) {
                this.updateSettings(webviewPanel.webview);
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            changeConfigurationSubscription.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(async e => {
            switch (e.type) {
                case 'client:ready':
                    this.updateSettings(webviewPanel.webview);
                    this.updateWebview(webviewPanel.webview, document.getText());
                    return;
                case 'change':
                    isFromWebview = true;
                    try {
                        await this.updateTextDocument(document, e.text);
                    } finally {
                        isFromWebview = false;
                    }
                    return;
                case 'request-import':
                    await this.handleImportRequest(webviewPanel.webview, e.requestId, e.format);
                    return;
                case 'request-export':
                    await this.handleExportRequest(e.data, e.filename, e.format);
                    return;
            }
        });
    }

    private updateTextDocument(document: vscode.TextDocument, text: string) {
        const edit = new vscode.WorkspaceEdit();

        // Calculate full range
        const firstLine = document.lineAt(0);
        const lastLine = document.lineAt(document.lineCount - 1);
        const range = new vscode.Range(firstLine.range.start, lastLine.range.end);

        edit.replace(document.uri, range, text);
        return vscode.workspace.applyEdit(edit);
    }

    private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Initial content
        const textStr = document.getText();

        // Get initial settings
        const config = vscode.workspace.getConfiguration('kakidash');
        const nodeWidth = config.get<number>('nodeWidth', 300);
        const customStyles = getKakidashStyles(config);

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
                    #mindmap-container { width: 100%; height: 100%; outline: none; }
                </style>
            </head>
            <body>
                <div id="mindmap-container" tabindex="-1"></div>
                <script nonce="${nonce}">
                    window.KAKIDASH_OPTIONS = {
                        maxNodeWidth: ${nodeWidth},
                        customStyles: ${JSON.stringify(customStyles)}
                    };
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
                <script nonce="${nonce}">
                    // Initialize with data
                    window.postMessage({ type: 'update', text: ${JSON.stringify(textStr)} }, '*');
                </script>
            </body>
        `;
    }

    private updateSettings(webview: vscode.Webview) {
        const config = vscode.workspace.getConfiguration('kakidash');
        const nodeWidth = config.get<number>('nodeWidth', 300);
        const customStyles = getKakidashStyles(config);

        webview.postMessage({
            type: 'settings',
            nodeWidth: nodeWidth,
            customStyles: customStyles
        });
    }

    private updateWebview(webview: vscode.Webview, text: string) {
        webview.postMessage({
            type: 'update',
            text: text,
        });
    }

    /**
     * Handle import request from webview
     */
    private async handleImportRequest(
        webview: vscode.Webview,
        requestId: string,
        format: string
    ): Promise<void> {
        try {
            // Determine file filter based on format
            const filters: { [name: string]: string[] } = {};
            if (format === 'xmind') {
                filters['XMind Files'] = ['xmind'];
            }

            // Show file picker
            const fileUris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters
            });

            if (!fileUris || fileUris.length === 0) {
                // User cancelled
                webview.postMessage({
                    type: 'import-response',
                    requestId,
                    data: null
                });
                return;
            }

            // Read file content
            const fileData = await vscode.workspace.fs.readFile(fileUris[0]);

            // Send response to webview
            webview.postMessage({
                type: 'import-response',
                requestId,
                data: fileData.buffer
            });
        } catch (error) {
            console.error('Error handling import request:', error);
            webview.postMessage({
                type: 'import-response',
                requestId,
                data: null
            });
        }
    }

    /**
     * Handle export request from webview
     */
    private async handleExportRequest(
        data: ArrayBuffer | string,
        filename: string,
        format: string
    ): Promise<void> {
        try {
            // Determine file filter and extension based on format
            const filters: { [name: string]: string[] } = {};
            let extension = format;

            if (format === 'png') {
                filters['PNG Files'] = ['png'];
            } else if (format === 'svg') {
                filters['SVG Files'] = ['svg'];
            } else if (format === 'markdown') {
                filters['Markdown Files'] = ['md'];
                extension = 'md';
            }

            // Create default URI with correct extension
            const defaultUri = vscode.Uri.file(filename);

            // Show save dialog
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri,
                filters
            });

            if (!saveUri) {
                // User cancelled
                return;
            }

            // Convert data to Uint8Array
            let uint8Array: Uint8Array;
            if (typeof data === 'string') {
                // Convert string to Uint8Array
                const encoder = new TextEncoder();
                uint8Array = encoder.encode(data);
            } else {
                // Convert ArrayBuffer to Uint8Array
                uint8Array = new Uint8Array(data);
            }

            // Write file
            await vscode.workspace.fs.writeFile(saveUri, uint8Array);
        } catch (error) {
            console.error('Error handling export request:', error);
            vscode.window.showErrorMessage(`Failed to export file: ${error}`);
        }
    }
}
