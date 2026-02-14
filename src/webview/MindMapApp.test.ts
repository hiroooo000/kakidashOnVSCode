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

    describe('FileHandler', () => {
        let mockVscode: any;

        beforeEach(() => {
            // Mock VSCode API
            mockVscode = {
                postMessage: jest.fn()
            };
        });

        test('should pass fileHandler to Kakidash options', () => {
            app = new MindMapApp(container, {}, undefined, mockVscode);

            expect(Kakidash).toHaveBeenCalledWith(
                container,
                expect.objectContaining({
                    fileHandler: expect.objectContaining({
                        onImportFile: expect.any(Function),
                        onExportFile: expect.any(Function)
                    })
                })
            );
        });

        test('onImportFile should send request-import message and return ArrayBuffer', async () => {
            app = new MindMapApp(container, {}, undefined, mockVscode);

            // Get the fileHandler from Kakidash constructor call
            const kakidashCall = (Kakidash as jest.Mock).mock.calls[0];
            const options = kakidashCall[1];
            const fileHandler = options.fileHandler;

            // Simulate response from extension
            const testData = new ArrayBuffer(8);

            // Call onImportFile
            const resultPromise = fileHandler.onImportFile('xmind');

            // Get the actual requestId from the postMessage call
            expect(mockVscode.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'request-import',
                    format: 'xmind'
                })
            );
            const requestId = mockVscode.postMessage.mock.calls[mockVscode.postMessage.mock.calls.length - 1][0].requestId;

            // Send response with the actual requestId
            setTimeout(() => {
                window.dispatchEvent(new MessageEvent('message', {
                    data: {
                        type: 'import-response',
                        requestId,
                        data: testData
                    }
                }));
            }, 10);

            const result = await resultPromise;
            expect(result).toBe(testData);
        });

        test('onImportFile should return null when cancelled', async () => {
            app = new MindMapApp(container, {}, undefined, mockVscode);

            const kakidashCall = (Kakidash as jest.Mock).mock.calls[0];
            const options = kakidashCall[1];
            const fileHandler = options.fileHandler;

            // Call onImportFile
            const resultPromise = fileHandler.onImportFile('xmind');

            // Get the actual requestId from the postMessage call
            const requestId = mockVscode.postMessage.mock.calls[mockVscode.postMessage.mock.calls.length - 1][0].requestId;

            // Simulate cancellation from extension
            setTimeout(() => {
                window.dispatchEvent(new MessageEvent('message', {
                    data: {
                        type: 'import-response',
                        requestId,
                        data: null
                    }
                }));
            }, 10);

            const result = await resultPromise;
            expect(result).toBeNull();
        });

        test('onExportFile should send request-export message with string data', async () => {
            app = new MindMapApp(container, {}, undefined, mockVscode);

            const kakidashCall = (Kakidash as jest.Mock).mock.calls[0];
            const options = kakidashCall[1];
            const fileHandler = options.fileHandler;

            const testData = '# Test Markdown';
            await fileHandler.onExportFile(testData, 'test.md', 'markdown');

            expect(mockVscode.postMessage).toHaveBeenCalledWith({
                type: 'request-export',
                data: testData,
                filename: 'test.md',
                format: 'markdown'
            });
        });

        test('onExportFile should convert Blob to ArrayBuffer before sending', async () => {
            app = new MindMapApp(container, {}, undefined, mockVscode);

            const kakidashCall = (Kakidash as jest.Mock).mock.calls[0];
            const options = kakidashCall[1];
            const fileHandler = options.fileHandler;

            const mockArrayBuffer = new ArrayBuffer(9);
            const testBlob = new Blob(['test data'], { type: 'image/png' });

            // Mock Blob.prototype.arrayBuffer
            const originalArrayBuffer = Blob.prototype.arrayBuffer;
            Blob.prototype.arrayBuffer = jest.fn().mockResolvedValue(mockArrayBuffer);

            await fileHandler.onExportFile(testBlob, 'test.png', 'png');

            expect(Blob.prototype.arrayBuffer).toHaveBeenCalled();
            expect(mockVscode.postMessage).toHaveBeenCalledWith({
                type: 'request-export',
                data: mockArrayBuffer,
                filename: 'test.png',
                format: 'png'
            });

            // Restore original method
            Blob.prototype.arrayBuffer = originalArrayBuffer;
        });
    });
});
