import * as vscode from 'vscode';
import { getNonce } from './getNonce';
import { getKakidashStyles } from '../Configuration';
import * as path from 'path';

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

        // Check for legacy format and migrate if necessary
        const migrated = await this.checkAndMigrateLegacyFormat(document);
        if (migrated) {
            // Migration happened and new file is opened, we can still load the current one
            // but the user will likely switch to the new one.
        }

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
                this.updateWebview(webviewPanel.webview, document);
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

        // Add save listener for cleanup
        const saveListener = vscode.workspace.onDidSaveTextDocument(doc => {
            if (doc.uri.toString() === document.uri.toString()) {
                this.cleanupUnusedImages(doc);
            }
        });

        webviewPanel.onDidDispose(() => {
            saveListener.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(async e => {
            switch (e.type) {
                case 'client:ready':
                    this.updateSettings(webviewPanel.webview);
                    await this.updateWebview(webviewPanel.webview, document);
                    return;
                case 'change':
                    await this.updateTextDocument(document, e.text);
                    if (e.images) {
                        await this.saveImages(document.uri, e.images);
                    }
                    return;
                case 'request-import':
                    await this.handleImportRequest(webviewPanel.webview, e.requestId, e.format);
                    return;
                case 'request-export':
                    await this.handleExportRequest(e.data, document, e.format);
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

    private async updateWebview(webview: vscode.Webview, document: vscode.TextDocument) {
        const images = await this.readImages(document.uri);
        webview.postMessage({
            type: 'update',
            text: document.getText(),
            images: images
        });
    }

    private async saveImages(uri: vscode.Uri, images: Record<string, string>) {
        const dir = path.dirname(uri.fsPath);
        const name = path.basename(uri.fsPath, path.extname(uri.fsPath));
        const imagesDir = vscode.Uri.file(path.join(dir, `${name}_images`));

        // Create directory if it doesn't exist
        await vscode.workspace.fs.createDirectory(imagesDir);

        // Save new/updated images
        for (const [ref, base64Data] of Object.entries(images)) {
            const filePath = vscode.Uri.joinPath(imagesDir, ref);
            
            // Handle both data URL and raw base64
            const commaIndex = base64Data.indexOf(',');
            const base64 = commaIndex !== -1 ? base64Data.substring(commaIndex + 1) : base64Data;
            
            if (!base64 || base64.trim() === '') {
                console.warn(`Skipping empty image data for ${ref}`);
                continue;
            }

            try {
                const buffer = Buffer.from(base64, 'base64');
                if (buffer.length > 0) {
                    await vscode.workspace.fs.writeFile(filePath, buffer);
                } else {
                    console.warn(`Generated buffer for ${ref} is empty, skipping.`);
                }
            } catch (e) {
                console.error(`Failed to save image ${ref}:`, e);
            }
        }
    }

    public async cleanupUnusedImages(document: vscode.TextDocument) {
        const dir = path.dirname(document.uri.fsPath);
        const name = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));
        const imagesDir = vscode.Uri.file(path.join(dir, `${name}_images`));

        try {
            const text = document.getText();
            const usedRefs = new Set<string>();
            const refRegex = /"(?:image|thumbnail)Ref":\s*"([^"]+)"/g;
            let match;
            while ((match = refRegex.exec(text)) !== null) {
                usedRefs.add(match[1]);
            }

            const files = await vscode.workspace.fs.readDirectory(imagesDir);
            for (const [fileName, fileType] of files) {
                if (fileType === vscode.FileType.File) {
                    if (!usedRefs.has(fileName)) {
                        const filePath = vscode.Uri.joinPath(imagesDir, fileName);
                        await vscode.workspace.fs.delete(filePath);
                    }
                }
            }
        } catch (e) {
            // Directory might not exist or other error, ignore
        }
    }

    private async readImages(uri: vscode.Uri): Promise<Record<string, string>> {
        const dir = path.dirname(uri.fsPath);
        const name = path.basename(uri.fsPath, path.extname(uri.fsPath));
        const imagesDir = vscode.Uri.file(path.join(dir, `${name}_images`));

        const images: Record<string, string> = {};
        try {
            const files = await vscode.workspace.fs.readDirectory(imagesDir);
            for (const [fileName, fileType] of files) {
                if (fileType === vscode.FileType.File) {
                    const filePath = vscode.Uri.joinPath(imagesDir, fileName);
                    const content = await vscode.workspace.fs.readFile(filePath);
                    const base64 = Buffer.from(content).toString('base64');
                    
                    // Detect mime type from extension
                    const ext = path.extname(fileName).toLowerCase().slice(1);
                    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                                 ext === 'gif' ? 'image/gif' : 
                                 ext === 'svg' ? 'image/svg+xml' : 'image/png';
                    
                    images[fileName] = `data:${mime};base64,${base64}`;
                }
            }
        } catch (e) {
            // Directory not found is fine, return empty map
        }
        return images;
    }

    private async checkAndMigrateLegacyFormat(document: vscode.TextDocument): Promise<boolean> {
        const text = document.getText();
        if (!text.trim()) {
            return false;
        }

        try {
            const parsed = JSON.parse(text);
            let needsMigration = false;
            let dataToMigrate = parsed;

            // 1. Check for missing nodeData wrapper (Primary indicator of legacy format)
            if (!parsed.nodeData) {
                needsMigration = true;
                dataToMigrate = { nodeData: parsed };
            }

            // 2. Check for legacy 'image' property (embedded high-res images)
            // We only trigger structural migration if 'image' exists. 
            // 'thumbnail' is kept in JSON for display, so we don't trigger migration based on it.
            if (this.hasLegacyImageProperty(dataToMigrate.nodeData)) {
                needsMigration = true;
            }

            if (needsMigration) {
                const fileName = path.basename(document.uri.fsPath);
                const baseName = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));
                
                // Avoid migrating a file that is already a copy if we can help it, 
                // but primarily the 'image' property check above prevents the loop.
                if (baseName.endsWith('_copy')) {
                    // If it's already a copy but still has legacy properties, 
                    // we might want to migrate it in-place instead of creating _copy_copy
                    // but for now, let's just proceed to ensure the user gets a working file.
                }

                const message = `「${fileName}」は旧バージョンの形式、または埋め込み画像を含んでいます。データの安全な移行のため、新しい形式のコピー「${baseName}_copy.mindmap」を作成して開きます。`;
                vscode.window.showInformationMessage(message);

                const dir = path.dirname(document.uri.fsPath);
                const newUri = vscode.Uri.file(path.join(dir, `${baseName}_copy.mindmap`));

                // Save extracted images to the sidecar folder for the NEW file
                const extractedImages: Record<string, string> = {};
                const extractCounter = { val: 1 };
                this.extractImagesFromJson(dataToMigrate.nodeData, extractedImages, extractCounter);

                if (Object.keys(extractedImages).length > 0) {
                    await this.saveImages(newUri, extractedImages);
                }

                // Write the migrated JSON to the new file
                const encoder = new TextEncoder();
                const uint8Array = encoder.encode(JSON.stringify(dataToMigrate, null, 2));
                await vscode.workspace.fs.writeFile(newUri, uint8Array);

                // Open the newly created file
                await vscode.commands.executeCommand('vscode.open', newUri);

                return true;
            }
        } catch (e) {
            // Not a JSON or invalid, ignore
        }

        return false;
    }

    private hasLegacyImageProperty(node: any): boolean {
        if (!node || typeof node !== 'object') {
            return false;
        }

        // If it has legacy 'image' field (base64), it needs migration
        if (node.image && typeof node.image === 'string' && node.image.startsWith('data:')) {
            return true;
        }

        // Recurse children
        if (node.children && Array.isArray(node.children)) {
            return node.children.some((child: any) => this.hasLegacyImageProperty(child));
        }

        return false;
    }

    private extractImagesFromJson(node: any, images: Record<string, string>, counter: { val: number }): boolean {
        if (!node || typeof node !== 'object') {
            return false;
        }

        let found = false;

        // Extract image if it's base64
        if (node.image && typeof node.image === 'string' && node.image.startsWith('data:')) {
            const match = node.image.match(/^data:image\/(\w+);base64,/);
            const ext = match ? match[1] : 'png';
            const ref = `img_${counter.val++}.${ext}`;
            
            images[ref] = node.image;
            node.imageRef = ref;

            // If thumbnail is missing, keep a copy of the image as thumbnail for display
            // (In a real app we'd resize it, but for migration we keep it to ensure display)
            if (!node.thumbnail) {
                node.thumbnail = node.image;
                // Mark for thumbnail fix in webview
                (node as any)._needsThumbnailFix = true;
            }

            delete node.image;
            found = true;
        }

        // Handle thumbnail: 
        // If it's a base64, we usually keep it in JSON for fast node rendering.
        // But if it's huge, we might want to extract it.
        // For now, let's ensure it's present for display.
        if (node.thumbnail && typeof node.thumbnail === 'string' && node.thumbnail.startsWith('data:')) {
            found = true;
            // We DON'T delete thumbnail from JSON because kakidash 0.3.2 
            // likely uses it for the node display and doesn't support thumbnailRef.
        }

        // Recurse into children
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                if (this.extractImagesFromJson(child, images, counter)) {
                    found = true;
                }
            }
        }

        return found;
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
        document: vscode.TextDocument,
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
            const dir = path.dirname(document.fileName);
            const name = path.basename(document.fileName, path.extname(document.fileName));
            const defaultUri = vscode.Uri.file(path.join(dir, `${name}.${extension}`));

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
