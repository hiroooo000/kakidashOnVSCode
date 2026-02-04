import { getKakidashStyles, ConfigurationProvider } from './Configuration';

describe('getKakidashStyles', () => {
    it('should return default styles when no config is provided', () => {
        const mockConfig: ConfigurationProvider = {
            get: (key: string, defaultValue?: any) => defaultValue
        };

        const styles = getKakidashStyles(mockConfig);

        expect(styles).toEqual({
            rootNode: {
                background: '#ffeeee',
                color: '#333333',
                border: '4px solid #FFD700'
            },
            childNode: {
                background: '#ffffff',
                color: '#555555',
                border: '2px dashed #0000FF'
            },
            connection: {
                color: '#FFA500'
            },
            canvas: {
                background: '#fafafa'
            }
        });
    });

    it('should correctly construct border string from individual properties', () => {
        const configMap: Record<string, any> = {
            'style.rootNode.borderStyle': 'dotted',
            'style.rootNode.borderWidth': 5,
            'style.rootNode.borderColor': 'red',
        };

        const mockConfig: ConfigurationProvider = {
            get: (key: string, defaultValue?: any) => configMap[key] ?? defaultValue
        };

        const styles = getKakidashStyles(mockConfig);
        expect(styles.rootNode.border).toBe('5px dotted red');
    });

    it('should use custom colors for background and text', () => {
        const configMap: Record<string, any> = {
            'style.rootNode.background': '#000000',
            'style.rootNode.color': '#ffffff',
        };

        const mockConfig: ConfigurationProvider = {
            get: (key: string, defaultValue?: any) => configMap[key] ?? defaultValue
        };

        const styles = getKakidashStyles(mockConfig);
        expect(styles.rootNode.background).toBe('#000000');
        expect(styles.rootNode.color).toBe('#ffffff');
    });
});
