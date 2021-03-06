import EventBus from '@/event';

export const editorBarKeyMap = {
    'Ctrl+K Ctrl+U': {
        command: 'closeSavedTab'
    },
    'Ctrl+K Ctrl+W': {
        command: 'closeAllTab'
    },
    'Ctrl+F4': {
        command: 'closeTab'
    },
}

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