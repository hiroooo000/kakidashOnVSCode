import * as vscode from 'vscode';
import { MindMapPanel } from './panels/MindMapPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Kakidash Extension Activated');
    try {
        context.subscriptions.push(MindMapPanel.register(context));
        console.log('Kakidash Custom Editor Registered');
    } catch (e) {
        console.error('Failed to register Kakidash Custom Editor', e);
    }
}
