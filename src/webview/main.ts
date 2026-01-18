import { MindMapApp } from './MindMapApp';

// VSCode API definition
declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};

const vscode = acquireVsCodeApi();
const container = document.getElementById('mindmap-container');

if (container) {
    const app = new MindMapApp(container, (text: string) => {
        vscode.postMessage({
            type: 'change',
            text: text
        });
    });

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                app.loadData(message.text);
                return;
            case 'settings':
                if (message.nodeWidth !== undefined) {
                    app.setNodeWidth(message.nodeWidth);
                }
                return;
        }
    });

    // Notify the extension that we are ready to receive data
    vscode.postMessage({ type: 'client:ready' });
} else {
    console.error('MindMap container not found');
}
