import { Kakidash, MindMapData } from 'kakidash';

export class MindMapApp {
    private board: Kakidash | undefined;
    private isSyncing = false;

    constructor(private container: HTMLElement, private onChange?: (text: string) => void) {
        if (!container) {
            throw new Error('Container element not found');
        }
        this.board = new Kakidash(container);

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
    }

    public getBoard(): Kakidash | undefined {
        return this.board;
    }
}
