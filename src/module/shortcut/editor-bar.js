import EventBus from '@/event';
import globalData from '@/data/globalData';

export const editorBarComands = [
    {
        name: 'Close Saved',
        label: 'Close Saved Editor Tab',
        key: 'Ctrl+K Ctrl+U',
        command: 'closeSavedTab'
    },
    {
        name: 'Close All',
        label: 'Close All Editor Tab',
        key: 'Ctrl+K Ctrl+W',
        command: 'closeAllTab'
    },
    {
        name: 'Close',
        label: 'Close Editor Tab',
        key: 'Ctrl+F4',
        command: 'closeTab'
    },
    {
        name: 'Close Other',
        label: 'Close Other Editor Tab',
        key: '',
        command: 'closeOhterTab'
    },
    {
        name: 'Close to Left',
        label: 'Close Editor Tab to Left',
        key: '',
        command: 'closeLeftTab'
    },
    {
        name: 'Close to Right',
        label: 'Close Editor Tab to Right',
        key: '',
        command: 'closeRightTab'
    },
]

export class EditorBarComand {
    constructor() { }
    execComand(command) {
		if(this[command.command]) {
			this[command.command](command);
		}
	}
    closeSavedTab() {
        EventBus.$emit('editor-close-saved');
    }
    closeAllTab() {
        EventBus.$emit('editor-close-all');
    }
    closeTab() {
        if(globalData.nowEditorId) {
            EventBus.$emit('editor-close', globalData.nowEditorId);
        }
    }
    closeOhterTab() {
        if(globalData.nowEditorId) {
            EventBus.$emit('editor-close-other', globalData.nowEditorId);
        }
    }
    closeLeftTab() {
        if(globalData.nowEditorId) {
            EventBus.$emit('editor-close-to-left', globalData.nowEditorId);
        }
    }
    closeRightTab() {
        if(globalData.nowEditorId) {
            EventBus.$emit('editor-close-to-right', globalData.nowEditorId);
        }
    }
}