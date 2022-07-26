import EventBus from '@/event';
import globalData from '@/data/globalData';

export const terminalBarComands = [
    {
        name: 'Close All',
        label: 'Close All Terminal Tab',
        key: 'Ctrl+T Ctrl+W',
        command: 'closeAllTerminalTab'
    },
    {
        name: 'Close',
        label: 'Close Terminal Tab',
        key: 'Ctrl+T Ctrl+F4',
        command: 'closeTerminalTab'
    },
    {
        name: 'Close Ohter',
        label: 'Close Other Terminal Tab',
        key: '',
        command: 'closeOhterTerminalTab'
    },
    {
        name: 'Close to Left',
        label: 'Close Terminal Tab to Left',
        key: '',
        command: 'closeLeftTerminalTab'
    },
    {
        name: 'Close to Right',
        label: 'Close Terminal Tab to Right',
        key: '',
        command: 'closeRightTerminalTab'
    },
]

export class TerminalBarComand {
    constructor() { }
    execComand(command, args) {
        args = args || {};
        this.termianlTabId = args.termianlTabId || globalData.nowTerminalId;
        if (this[command.command] && this.termianlTabId) {
            this[command.command](command);
        }
    }
    closeAllTerminalTab() {
        EventBus.$emit('terminal-close-all');
    }
    closeTerminalTab() {
        EventBus.$emit('terminal-close', this.termianlTabId);
    }
    closeOhterTerminalTab() {
        EventBus.$emit('terminal-close-other', this.termianlTabId);
    }
    closeLeftTerminalTab() {
        EventBus.$emit('terminal-close-to-left', this.termianlTabId);
    }
    closeRightTerminalTab() {
        EventBus.$emit('terminal-close-to-right', this.termianlTabId);
    }
}