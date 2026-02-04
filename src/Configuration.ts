export interface ConfigurationProvider {
    get<T>(section: string, defaultValue?: T): T | undefined;
}

export function getKakidashStyles(config: ConfigurationProvider): any {
    const get = <T>(key: string, def: T) => config.get<T>(key, def) ?? def;

    const rootNodeBorder = [
        `${get('style.rootNode.borderWidth', 4)}px`,
        get('style.rootNode.borderStyle', 'solid'),
        get('style.rootNode.borderColor', '#FFD700')
    ].join(' ');

    const childNodeBorder = [
        `${get('style.childNode.borderWidth', 2)}px`,
        get('style.childNode.borderStyle', 'dashed'),
        get('style.childNode.borderColor', '#0000FF')
    ].join(' ');

    return {
        rootNode: {
            background: get('style.rootNode.background', '#ffeeee'),
            color: get('style.rootNode.color', '#333333'),
            border: rootNodeBorder
        },
        childNode: {
            background: get('style.childNode.background', '#ffffff'),
            color: get('style.childNode.color', '#555555'),
            border: childNodeBorder
        },
        connection: {
            color: get('style.connection.color', '#FFA500')
        },
        canvas: {
            background: get('style.canvas.background', '#fafafa')
        }
    };
}
