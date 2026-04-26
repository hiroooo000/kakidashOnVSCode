import { Kakidash, MindMapData, KakidashOptions, FileHandler } from 'kakidash';

// Mock window.confirm for VSCode Webview restrictions
// kakidash library uses window.confirm in importXMind method,
// so override it to always return true
(window as any).confirm = () => true;

// VSCode API type
interface VSCodeAPI {
    postMessage(message: any): void;
}

export class MindMapApp {
    private board: Kakidash | undefined;
    private isSyncing = true;
    private selectedNodeId: string | null = null;
    private vscode: VSCodeAPI | undefined;
    private pendingRequests: Map<string, (value: any) => void> = new Map();
    private myMemoryImageMap: Record<string, string> = {};

    constructor(
        private container: HTMLElement,
        options: KakidashOptions = {},
        private onChange?: (text: string, images?: Record<string, string>) => void,
        vscode?: VSCodeAPI
    ) {
        if (!container) {
            throw new Error('Container element not found');
        }

        this.vscode = vscode;

        // Create FileHandler if vscode API is available
        const fileHandler: FileHandler | undefined = vscode ? {
            onImportFile: this.handleImportFile.bind(this),
            onExportFile: this.handleExportFile.bind(this)
        } : undefined;

        // Initialize Kakidash with fileHandler option
        this.board = new Kakidash(container, {
            ...options,
            fileHandler,
            // @ts-ignore: getImage might be missing in older type definitions
            getImage: (ref: string) => this.myMemoryImageMap[ref]
        });

        // Set up message listener for import responses
        if (vscode) {
            window.addEventListener('message', this.handleMessage.bind(this));
        }

        if (this.onChange) {
            this.board.on('model:change', () => {
                if (this.isSyncing) {
                    return;
                }
                // Perform garbage collection for images in memory before getting them for save
                this.board?.gcImages();
                
                const data = this.board?.getData();
                const images = this.board?.getImages();
                if (data && this.onChange) {
                    this.onChange(JSON.stringify(data, null, 2), images);
                }
            });

            // Track selection
            this.board.on('node:select', (id: string | null) => {
                this.selectedNodeId = id;
            });
        }

        // Ensure container can be focused
        this.container.focus();

        // Re-focus when window gets focus (e.g. switching tabs back)
        window.addEventListener('focus', () => {
            this.container.focus();
        });

        // Listen for keydown to handle initial focus when nothing is selected
        window.addEventListener('keydown', (e) => {
            if (!this.board) { return; }
            if (this.selectedNodeId) { return; }

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'h', 'j', 'k', 'l'].includes(e.key)) {
                e.preventDefault();
                const root = this.board.getRoot();
                if (root) {
                    this.board.selectNode(root.id);
                }
            }
        });
    }

    public updateOptions(options: KakidashOptions): void {
        if (!this.board) {
            return;
        }
        if (options.maxNodeWidth !== undefined) {
            this.board.setMaxNodeWidth(options.maxNodeWidth);
        }
        if (options.customStyles) {
            this.board.updateGlobalStyles(options.customStyles);
        }
    }

    /**
     * Parse and load data into the mindmap.
     * Handles empty or invalid JSON by loading a default root node.
     */
    public async loadData(text: string, images?: Record<string, string>): Promise<void> {
        this.isSyncing = true;
        if (!this.board) {
            return;
        }
        if (images) {
            this.myMemoryImageMap = images;
        }
        try {
            let parsed: any;

            if (!text || !text.trim()) {
                // Normal case for new/empty file
                parsed = {
                    id: 'root',
                    topic: 'Root Topic',
                    root: true,
                    children: []
                };
            } else {
                try {
                    parsed = JSON.parse(text);
                } catch (e) {
                    console.warn('Failed to parse JSON, initializing with default root:', e);
                    parsed = {
                        id: 'root',
                        topic: 'Root Topic',
                        root: true,
                        children: []
                    };
                }
            }

            // Check if data is already in MindMapData format (has nodeData)
            // or if it is raw node data (legacy/simple)
            let data: MindMapData;
            if (parsed.nodeData) {
                data = parsed as MindMapData;
            } else {
                // Check if it looks like a node (has id and topic)
                if (!parsed.id || !parsed.topic) {
                    // Fallback if totally invalid structure
                    parsed = {
                        id: 'root',
                        topic: 'Root Topic',
                        root: true,
                        children: []
                    };
                }
                data = {
                    nodeData: parsed
                };
            }

            if (images) {
                this.myMemoryImageMap = images;
                
                // Explicitly sync images to the internal image store.
                // In kakidash 0.3.2, the constructor's getImage callback may not be correctly used
                // for zoomed views if the store is empty.
                const anyBoard = this.board as any;
                const store = anyBoard?.controller?.imageStore;
                if (store && typeof store.addImage === 'function') {
                    for (const [ref, data] of Object.entries(images)) {
                        store.addImage(ref, data);
                    }
                }
            }
            
            // Fix legacy thumbnails if needed
            if (images) {
                const changed = await this.ensureThumbnails(data.nodeData, images);
                if (changed) {
                    // Trigger a change after loadData finishes to save the new thumbnails
                    setTimeout(() => {
                        const updatedData = this.board?.getData();
                        const updatedImages = this.board?.getImages();
                        if (updatedData && this.onChange) {
                            this.onChange(JSON.stringify(updatedData, null, 2), updatedImages);
                        }
                    }, 500);
                }
            }

            this.board.loadData(data);
        } finally {
            this.isSyncing = false;
        }

        // Ensure focus after loading new data
        setTimeout(() => {
            this.container.focus();
        }, 0);
    }

    public getBoard(): Kakidash | undefined {
        return this.board;
    }

    public setNodeWidth(width: number): void {
        try {
            if (this.board) {
                this.board.setMaxNodeWidth(width);
            }
        } catch (e) {
            console.error('Failed to set node width:', e);
        }
    }

    /**
     * Handle import file request from FileHandler
     */
    private async handleImportFile(format: string): Promise<ArrayBuffer | string | null> {
        if (!this.vscode) {
            return null;
        }

        const requestId = this.generateRequestId();

        // Send request to extension
        this.vscode.postMessage({
            type: 'request-import',
            requestId,
            format
        });

        // Wait for response
        return new Promise((resolve) => {
            this.pendingRequests.set(requestId, resolve);
        });
    }

    /**
     * Handle export file request from FileHandler
     */
    private async handleExportFile(
        data: Blob | string,
        filename: string,
        format: string
    ): Promise<void> {
        if (!this.vscode) {
            return;
        }

        // Convert Blob to ArrayBuffer if necessary
        const exportData = data instanceof Blob ? await data.arrayBuffer() : data;

        // Send export request to extension
        this.vscode.postMessage({
            type: 'request-export',
            data: exportData,
            filename,
            format
        });
    }

    /**
     * Handle messages from extension
     */
    private handleMessage(event: MessageEvent): void {
        const message = event.data;

        if (message.type === 'import-response' && message.requestId) {
            const resolve = this.pendingRequests.get(message.requestId);
            if (resolve) {
                resolve(message.data);
                this.pendingRequests.delete(message.requestId);
            }
        }
    }

    /**
     * Generate unique request ID
     */
    private generateRequestId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private async ensureThumbnails(node: any, images: Record<string, string>): Promise<boolean> {
        let changed = false;

        if (node._needsThumbnailFix && node.imageRef) {
            try {
                const original = images[node.imageRef];
                if (original) {
                    const thumbnail = await this.generateThumbnail(original);
                    if (thumbnail) {
                        node.thumbnail = thumbnail;
                        delete node._needsThumbnailFix;
                        changed = true;
                    }
                }
            } catch (e) {
                console.error('Failed to generate thumbnail:', e);
            }
        }

        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                if (await this.ensureThumbnails(child, images)) {
                    changed = true;
                }
            }
        }

        return changed;
    }

    private generateThumbnail(dataUrl: string, maxWidth = 200): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ratio = Math.min(maxWidth / img.width, 1);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get 2D context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Use webp for better compression, fallback to jpeg if dataURL is png
                const result = canvas.toDataURL('image/webp', 0.7);
                resolve(result);
            };
            img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
            img.src = dataUrl;
        });
    }
}
