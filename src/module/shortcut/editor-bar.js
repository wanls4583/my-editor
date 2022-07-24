import EventBus from '@/event';

export const editorBarKeyMap = {
    'control+KeyK control+KeyU': {
        command: 'closeSavedTab'
    },
    'control+KeyK control+KeyW': {
        command: 'closeAllTab'
    },
    'control+F4': {
        command: 'closeTab'
    },
}

export class EditorBarComand {
    constructor() { }
    closeSavedTab() {
        EventBus.$on('editor-close-saved');
    }
    closeAllTab() {
        EventBus.$on('editor-close-all');
    }
    closeTab() {
        EventBus.$emit('editor-close');
    }
}