import { Kakidash, MindMapData, KakidashOptions } from 'kakidash';

export class MindMapApp {
    private board: Kakidash | undefined;
    private isSyncing = false;
    private selectedNodeId: string | null = null;

    constructor(private container: HTMLElement, options: KakidashOptions = {}, private onChange?: (text: string) => void) {
        if (!container) {
            throw new Error('Container element not found');
        }
        this.board = new Kakidash(container, options);

        if (this.onChange) {
            this.board.on('model:change', () => {
                if (this.isSyncing) {
                    return;
                }
                const data = this.board?.getData();
                if (data && this.onChange) {
                    this.onChange(JSON.stringify(data, null, 2));
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
    public loadData(text: string): void {
        if (!this.board) {
            return;
        }
        this.isSyncing = true;
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
}
