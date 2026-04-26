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
    const app = new MindMapApp(container, options, (text: string, images?: Record<string, string>) => {
        vscode.postMessage({
            type: 'change',
            text: text,
            images: images
        });
    }, vscode);

    // Handle messages from the extension
    window.addEventListener('message', async event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                await app.loadData(message.text, message.images);
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
