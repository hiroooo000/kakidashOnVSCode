import { MindMapApp } from './MindMapApp';
import { Kakidash } from 'kakidash';

// Mock everything from kakidash
jest.mock('kakidash', () => {
    let eventListeners: { [key: string]: Function } = {};

    return {
        Kakidash: jest.fn().mockImplementation(() => {
            eventListeners = {};
            return {
                loadData: jest.fn().mockImplementation(() => {
                    // Simulate change event during load if a listener exists
                    if (eventListeners['model:change']) {
                        eventListeners['model:change']();
                    }
                }),
                on: jest.fn().mockImplementation((event, callback) => {
                    eventListeners[event] = callback;
                }),
                getData: jest.fn().mockReturnValue({ id: 'root', topic: 'Mock Data' })
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
        expect(Kakidash).toHaveBeenCalledWith(container, {});
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

    test('should call onChange when model:change event fires', () => {
        const onChange = jest.fn();
        app = new MindMapApp(container, {}, onChange);
        const board = app.getBoard();

        expect(board?.on).toHaveBeenCalledWith('model:change', expect.any(Function));

        // Manually trigger the event listener
        // We know from our mock that `on` stores the callback in `eventListeners` but we can't access it directly here easily 
        // because it's inside the factory.
        // BUT we can access the mock call arguments.
        const callback = (board?.on as jest.Mock).mock.calls[0][1];
        callback();

        expect(onChange).toHaveBeenCalledWith(expect.stringContaining('Mock Data'));
    });

    // This test relies on the mock implementation of loadData triggering the event
    test('should NOT call onChange during loadData due to isSyncing', () => {
        const onChange = jest.fn();
        app = new MindMapApp(container, {}, onChange);

        // Verify loadData trigger event inside mock
        app.loadData('{}');

        // Since loadData triggers the event inside the mock, valid onChange would be called if isSyncing wasn't working.
        // We expect it NOT to be called because isSyncing should be true.
        expect(onChange).not.toHaveBeenCalled();
    });
});
