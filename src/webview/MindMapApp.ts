import { Kakidash, MindMapData } from 'kakidash';

export class MindMapApp {
    private board: Kakidash | undefined;

    constructor(private container: HTMLElement) {
        if (!container) {
            throw new Error('Container element not found');
        }
        this.board = new Kakidash(container);
    }

    /**
     * Parse and load data into the mindmap.
     * Handles empty or invalid JSON by loading a default root node.
     */
    public loadData(text: string): void {
        if (!this.board) {
            return;
        }

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
    }

    public getBoard(): Kakidash | undefined {
        return this.board;
    }
}
