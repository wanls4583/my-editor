import EventBus from '@/event';

const remote = window.require('@electron/remote');

export default class {
    constructor() {}
    init() {
        EventBus.$on('reveal-in-file-explorer', (path) => {
            if (path) {
                remote.shell.showItemInFolder(path);
            }
        });
    }
}
