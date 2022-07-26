import EventBus from '@/event';

export const editorBarComands = [
    {
        name: 'Close Saved',
        key: 'Ctrl+K Ctrl+U',
        command: 'closeSavedTab'
    },
    {
        name: 'Close All',
        key: 'Ctrl+K Ctrl+W',
        command: 'closeAllTab'
    },
    {
        name: 'Close',
        key: 'Ctrl+F4',
        command: 'closeTab'
    },
]

export class EditorBarComand {
    constructor() { }
    closeSavedTab() {
        EventBus.$emit('editor-close-saved');
    }
    closeAllTab() {
        EventBus.$emit('editor-close-all');
    }
    closeTab() {
        EventBus.$emit('editor-close');
    }
}