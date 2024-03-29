import { editorComands, EditorComand } from './editor';
import { editorBarComands, EditorBarComand } from './editor-bar';
import { terminalBarComands, TerminalBarComand } from './terminal-bar';
import { windowComands, WindowCommand } from './window';
import { fileTreeComands, FileTreeComand } from './file-tree';
import vkeys from 'vkeys';
import EventBus from '@/event';
import globalData from '../../data/globalData';

export default class {
    constructor() {
        this.prevKeyStr = '';
        this.keys = [];
        this.userShortcut = [];
        this.cKeys = ['Ctrl', 'Alt', 'Shift'];
        this.keyMap = {};
        this.commandMap = {};
        this.editorComand = new EditorComand();
        this.editorBarComand = new EditorBarComand();
        this.terminalBarComand = new TerminalBarComand();
        this.windowCommand = new WindowCommand();
        this.fileTreeComand = new FileTreeComand();
        this.initKeyMap();
        EventBus.$on('shortcut-loaded', (data) => {
            this.userShortcut = data.filter((item) => {
                item.key = item.key || '';
                return item.command;
            });
            this.initUserKeyMap(data);
        });
        EventBus.$on('shortcut-change', (data) => {
            this.userShortcut = this.userShortcut.filter((item) => {
                return data.command !== item.command;
            });
            this.userShortcut.push(data);
            globalData.$mainWin.persistence.storeShortcutData(this.userShortcut);
        });
        window.addEventListener('blur', () => {
            this.keys = [];
        });
    }
    initKeyMap() {
        editorComands.forEach(item => {
            let _key = item.key.toLowerCase();
            item = { ...item };
            this.keyMap[_key] = this.keyMap[_key] || [];
            this.keyMap[_key].push(item);
            this.commandMap[item.command] = item;
            item.label = item.label || item.name;
            item.commandObj = this.editorComand;
        });
        editorBarComands.forEach(item => {
            let _key = item.key.toLowerCase();
            item = { ...item };
            this.keyMap[_key] = this.keyMap[_key] || [];
            this.keyMap[_key].push(item);
            this.commandMap[item.command] = item;
            item.label = item.label || item.name;
            item.commandObj = this.editorBarComand;
        });
        terminalBarComands.forEach(item => {
            let _key = item.key.toLowerCase();
            item = { ...item };
            this.keyMap[_key] = this.keyMap[_key] || [];
            this.keyMap[_key].push(item);
            this.commandMap[item.command] = item;
            item.label = item.label || item.name;
            item.commandObj = this.terminalBarComand;
        });
        windowComands.forEach(item => {
            let _key = item.key.toLowerCase();
            item = { ...item };
            this.keyMap[_key] = this.keyMap[_key] || [];
            this.keyMap[_key].push(item);
            this.commandMap[item.command] = item;
            item.label = item.label || item.name;
            item.commandObj = this.windowCommand;
        });
        fileTreeComands.forEach(item => {
            let _key = item.key.toLowerCase();
            item = { ...item };
            this.keyMap[_key] = this.keyMap[_key] || [];
            this.keyMap[_key].push(item);
            this.commandMap[item.command] = item;
            item.label = item.label || item.name;
            item.commandObj = this.fileTreeComand;
        });
    }
    initUserKeyMap(data) {
        data = data || [];
        for (let i = 0; i < data.length; i++) {
            let item = data[i] || {};
            let key = item.key || '';
            let command = this.findCommandByName(item.command);
            if (command) {
                let _key = key.toLowerCase();
                let _oKey = command.key.toLowerCase();
                let arr = this.keyMap[_oKey];
                arr.splice(arr.indexOf(command), 1);
                if (arr.length === 0) {
                    delete this.keyMap[_oKey];
                }
                this.keyMap[_key] = this.keyMap[_key] || [];
                this.keyMap[_key].push(command);
                command.key = key;
                command.source = 'USER';
            }
        }
    }
    findCommandByKey(key) {
        let arr = this.keyMap[key.toLowerCase()];
        if (arr) {
            let editor = globalData.$mainWin.getNowEditor();
            if (editor && editor.cursorFocus && editor.editAble) {
                for (let i = 0; i < arr.length; i++) {
                    let command = arr[i];
                    if (command.when === 'editorFocus') {
                        return command;
                    }
                }
            }
            for (let i = 0; i < arr.length; i++) {
                let command = arr[i];
                if (!command.when) {
                    return command;
                }
            }
        }
    }
    findCommandByName(command) {
        return this.commandMap[command];
    }
    doComand(command, args) {
        let commandObj = command.commandObj;
        if (command.commandObj) {
            commandObj = command.commandObj;
        } else {
            command = this.findCommandByName(command.command);
            commandObj = command && command.commandObj;
        }
        if (commandObj && commandObj[command.command]) {
            if (this.editorComand === commandObj) {
                let editor = globalData.$mainWin.getNowEditor();
                let context = globalData.$mainWin.getNowContext();
                if (editor && context) {
                    commandObj.editor = editor;
                    commandObj.context = context;
                    commandObj.execComand(command, args);
                }
            } else {
                commandObj.execComand(command, args);
            }
        }
    }
    formatKey(key) {
        key = key.replace('+', 'Add');
        key = key[0].toUpperCase() + key.slice(1);
        return key;
    }
    getAllKeys() {
        let list = [];
        for (let key in this.keyMap) {
            let arr = this.keyMap[key];
            for (let i = 0; i < arr.length; i++) {
                let item = arr[i];
                list.push({
                    key: item.key,
                    when: item.when,
                    label: item.label,
                    command: item.command,
                    source: item.source || 'Default'
                });
            }
        }
        return list.sort((a, b) => {
            if (a.label > b.label) {
                return 1;
            } else if (a.label < b.label) {
                return -1;
            }
            return 0;
        });
    }
    onKeydown(e) {
        let key = this.formatKey(vkeys.getKey(e.keyCode));
        let command = '';
        let keyStr = '';
        if (this.preKeyTimer) {
            clearTimeout(this.preKeyTimer);
        }
        keyStr = this.keys.join('+');
        keyStr = keyStr ? keyStr + '+' + key : key;
        if (this.prevKeyStr) {
            command = this.findCommandByKey(this.prevKeyStr + ' ' + keyStr)
        }
        if (!command) {
            command = this.findCommandByKey(keyStr);
        }
        if (command) {
            e.stopPropagation();
            e.preventDefault();
            this.doComand(command);
            this.prevKeyStr = '';
            // 停止添加key到keys，已便按住键盘时可以连续相应某一个命令
            return;
        } else if (this.cKeys.indexOf(key) === -1) {
            this.prevKeyStr = keyStr;
        } else {
            this.prevKeyStr = '';
        }
        if (this.keys.indexOf(key) === -1) {
            this.keys.push(key);
        }
    }
    onKeyup(e) {
        if (this.keys.length) {
            let key = this.formatKey(vkeys.getKey(e.keyCode));
            let index = this.keys.indexOf(key);
            if (index > -1) {
                this.keys.splice(index, 1);
            }
        }
        if (this.prevKeyStr) {
            // prevKeyStr 两秒后失效
            this.preKeyTimer = setTimeout(() => {
                this.prevKeyStr = '';
            }, 2000);
        }
    }
}