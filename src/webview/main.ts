import { MindMapApp } from './MindMapApp';
import { KakidashOptions } from 'kakidash';

// VSCode API definition
declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};

declare global {
    interface Window {
        KAKIDASH_OPTIONS: KakidashOptions;
    }
}

const vscode = acquireVsCodeApi();
const container = document.getElementById('mindmap-container');

if (container) {
    const options = window.KAKIDASH_OPTIONS || {};
    const app = new MindMapApp(container, options, (text: string) => {
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
                app.updateOptions({
                    maxNodeWidth: message.nodeWidth,
                    customStyles: message.customStyles
                });
                return;
        }
    });

    // Notify the extension that we are ready to receive data
    vscode.postMessage({ type: 'client:ready' });
} else {
    console.error('MindMap container not found');
}
