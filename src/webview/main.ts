import { Kakidash } from 'kakidash';

// VSCode API definition
declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};

const vscode = acquireVsCodeApi();
const container = document.getElementById('mindmap-container');
if (!container) {
    throw new Error('Container element not found');
}
const board = new Kakidash(container);

// Handle messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'update':
            let data;
            try {
                if (!message.text || !message.text.trim()) {
                    throw new Error('Empty text');
                }
                data = JSON.parse(message.text);
            } catch (e) {
                console.warn('Failed to parse update or empty text, initializing with default root:', e);
                data = {
                    id: 'root',
                    topic: 'Root Topic',
                    children: []
                };
            }

            board.loadData(data);
            return;
    }
});
