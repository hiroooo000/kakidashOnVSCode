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
    const app = new MindMapApp(container);

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                app.loadData(message.text);
                return;
        }
    });
} else {
    console.error('MindMap container not found');
}
