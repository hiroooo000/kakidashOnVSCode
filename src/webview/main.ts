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

window.addEventListener('error', (event) => {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.background = 'red';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '20px';
    errorDiv.style.whiteSpace = 'pre-wrap';
    errorDiv.innerText = 'Error: ' + event.message + '\n' + (event.error?.stack || '');
    document.body.appendChild(errorDiv);
});

window.addEventListener('unhandledrejection', (event) => {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.background = 'red';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '20px';
    errorDiv.style.whiteSpace = 'pre-wrap';
    errorDiv.innerText = 'Unhandled Rejection: ' + event.reason?.message + '\n' + (event.reason?.stack || '');
    document.body.appendChild(errorDiv);
});

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
