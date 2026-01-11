import { MindMapApp } from './MindMapApp';
import { Kakidash } from 'kakidash';

// Mock everything from kakidash
jest.mock('kakidash', () => {
    return {
        Kakidash: jest.fn().mockImplementation(() => {
            return {
                loadData: jest.fn()
            };
        })
    };
});

describe('MindMapApp', () => {
    let container: HTMLElement;
    let app: MindMapApp;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '<div id="mindmap-container"></div>';
        container = document.getElementById('mindmap-container') as HTMLElement;
        jest.clearAllMocks();
    });

    test('should throw error if container is null', () => {
        expect(() => {
            new MindMapApp(null as any);
        }).toThrow('Container element not found');
    });

    test('should initialize Kakidash with container', () => {
        app = new MindMapApp(container);
        expect(Kakidash).toHaveBeenCalledWith(container);
    });

    test('should load valid data wrapped in nodeData', () => {
        app = new MindMapApp(container);
        const board = app.getBoard();

        const validJson = JSON.stringify({
            id: 'root',
            topic: 'Test Topic',
            children: []
        });

        app.loadData(validJson);

        // Expect loadData to be called with Object containing nodeData
        expect(board?.loadData).toHaveBeenCalledWith({
            nodeData: {
                id: 'root',
                topic: 'Test Topic',
                children: []
            }
        });
    });

    test('should handle empty text by loading default root', () => {
        app = new MindMapApp(container);
        const board = app.getBoard();

        app.loadData('');

        expect(board?.loadData).toHaveBeenCalledWith(expect.objectContaining({
            nodeData: expect.objectContaining({
                id: 'root',
                topic: 'Root Topic'
            })
        }));
    });

    test('should handle invalid JSON by loading default root', () => {
        app = new MindMapApp(container);
        const board = app.getBoard();

        app.loadData('{ invalid json');

        expect(board?.loadData).toHaveBeenCalledWith(expect.objectContaining({
            nodeData: expect.objectContaining({
                id: 'root',
                topic: 'Root Topic'
            })
        }));
    });
});
