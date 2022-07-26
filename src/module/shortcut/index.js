import { editorComands, EditorComand } from './editor';
import { editorBarComands, EditorBarComand } from './editor-bar';
import { windowComands, WindowCommand } from './window';
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
        this.windowCommand = new WindowCommand();
        this.initKeyMap();
        EventBus.$on('shortcut-loaded', (data) => {
            this.userShortcut = data;
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
            item.label = this.getLabel(item.key);
            item.commandObj = this.editorComand;
        });
        editorBarComands.forEach(item => {
            let _key = item.key.toLowerCase();
            item = { ...item };
            this.keyMap[_key] = this.keyMap[_key] || [];
            this.keyMap[_key].push(item);
            this.commandMap[item.command] = item;
            item.label = this.getLabel(item.key);
            item.commandObj = this.editorBarComand;
        });
        windowComands.forEach(item => {
            let _key = item.key.toLowerCase();
            item = { ...item };
            this.keyMap[_key] = this.keyMap[_key] || [];
            this.keyMap[_key].push(item);
            this.commandMap[item.command] = item;
            item.label = this.getLabel(item.key);
            item.commandObj = this.windowCommand;
        });
    }
    initUserKeyMap(data) {
        data = data || [];
        for (let i = 0; i < data.length; i++) {
            let item = data[i] || {};
            let key = item.key || '';
            let command = this.findCommandByName(item.command);
            if (command && key) {
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
                command.label = this.getLabel(key);
                command.source = 'USER';
            }
        }
    }
    findCommandByKey(key) {
        let arr = this.keyMap[key.toLowerCase()];
        if (arr) {
            let editor = globalData.$mainWin.getNowEditor();
            for (let i = 0; i < arr.length; i++) {
                let command = arr[i];
                if (command.when === 'editorFocus') {
                    if (editor && editor.cursorFocus && editor.editAble) {
                        return command;
                    }
                } else {
                    return command;
                }
            }
        }
    }
    findCommandByName(command) {
        return this.commandMap[command];
    }
    doComand(command) {
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
                    commandObj[command.command]();
                }
            } else {
                commandObj[command.command]();
            }
        }
    }
    formatKey(key) {
        key = key.replace('+', 'Add');
        key = key[0].toUpperCase() + key.slice(1);
        return key;
    }
    getLabel(key) {
        // if (key.indexOf(' ') > -1) {
        //     let i = 0
        //     key = key.split(' ');
        //     while (key[0][i] === key[1][i]) {
        //         i++;
        //     }
        //     key = key[0] + ' ' + key[1].slice(i);
        // }
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
                    command: item.command,
                    source: item.source || 'Default'
                });
            }
        }
        return list.sort((a, b) => {
            if (a.command > b.command) {
                return 1;
            } else if (a.command < b.command) {
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