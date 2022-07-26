import Util from '@/common/util';
import EventBus from '@/event';
import globalData from '@/data/globalData';

const path = window.require('path');

export const fileTreeComands = [
    {
        name: 'New File',
        label: 'Create File',
        key: '',
        command: 'createFile',
        when: 'fileItemSelected'
    },
    {
        name: 'New Folder',
        label: 'Create Folder',
        key: '',
        command: 'createFolder',
        when: 'fileItemSelected'
    },
    {
        name: 'Reveal in File Explorer',
        key: '',
        command: 'revealInFileExplorer',
        when: 'fileItemSelected'
    },
    {
        name: 'Find in Folder',
        key: '',
        command: 'findInFolder',
        when: 'fileItemSelected'
    },
    {
        name: 'Open in Terminal',
        key: '',
        command: 'openInTerminal',
        when: 'fileItemSelected'
    },
    {
        name: 'Remove Folder from Workspace',
        key: '',
        command: 'removeFolder',
        when: 'fileItemSelected'
    },
    {
        name: 'Copy',
        key: '',
        command: 'copyFile',
        when: 'fileItemSelected'
    },
    {
        name: 'Cut',
        key: '',
        command: 'cutFile',
        when: 'fileItemSelected'
    },
    {
        name: 'Paste',
        key: '',
        command: 'pasteFile',
        when: 'fileItemSelected'
    },
    {
        name: 'Copy Path',
        key: '',
        command: 'copyPath',
        when: 'fileItemSelected'
    },
    {
        name: 'Copy Relative Path',
        key: '',
        command: 'copyRelativePath',
        when: 'fileItemSelected'
    },
    {
        name: 'Rename',
        key: '',
        command: 'rename',
        when: 'fileItemSelected'
    },
    {
        name: 'Delete',
        label: 'Delete File',
        key: '',
        command: 'deleteFile',
        when: 'fileItemSelected'
    },
]

export class FileTreeComand {
    constructor() {

    }
    execComand(command, args) {
        args = args || {};
        this.treeItem = args.treeItem || globalData.nowFileItem;
        if (this[command.command] && this.treeItem) {
            this[command.command](command);
        }
    }
    createFile() {
        if (this.treeItem.type === 'dir') {
            EventBus.$emit('file-create-tree', this.treeItem.path);
        }
    }
    createFolder() {
        EventBus.$emit('folder-create-tree', this.treeItem.path);
    }
    revealInFileExplorer() {
        EventBus.$emit('reveal-in-file-explorer', this.treeItem.path);
    }
    findInFolder() {
        let dirPath = path.relative(this.treeItem.rootPath, this.treeItem.path);
        dirPath = path.join(path.basename(this.treeItem.rootPath), dirPath);
        dirPath = '.' + path.sep + dirPath;
        EventBus.$emit('find-in-folder', { path: dirPath });
    }
    openInTerminal() {
        let dirPath = '';
        if (this.treeItem.type === 'file') {
            dirPath = path.dirname(this.treeItem.path);
        } else {
            dirPath = this.treeItem.path;
        }
        EventBus.$emit('terminal-new', dirPath);
    }
    removeFolder() {
        EventBus.$emit('folder-remove', this.treeItem.path);
    }
    copyFile() {
        EventBus.$emit('file-copy', this.treeItem);
    }
    cutFile() {
        EventBus.$emit('file-cut', this.treeItem);
    }
    pasteFile() {
        EventBus.$emit('file-paste', this.treeItem);
    }
    copyPath() {
        Util.writeClipboard(this.treeItem.path);
    }
    copyRelativePath() {
        Util.writeClipboard(path.relative(this.treeItem.rootPath, this.treeItem.path));
    }
    rename() {
        EventBus.$emit('file-rename-input', this.treeItem);
    }
    deleteFile() {
        EventBus.$emit('file-delete', this.treeItem);
    }
}