import { editorKeyMap, EditorComand } from './editor';
import { editorBarKeyMap, EditorBarComand } from './editor-bar';
import { menuBarKeyMap, MenuBarCommand } from './menu-bar';
import { windowKeyMap, WindowCommand } from './window';
import vkeys from 'vkeys';
import EventBus from '@/event';
import globalData from '../../data/globalData';

export default class {
    constructor() {
        this.prevKeyStr = '';
        this.keys = [];
        this.cKeys = ['ctrl', 'alt', 'shift'];
        this.keyMap = {};
        this.commandMap = {};
        this.editorComand = new EditorComand();
        this.editorBarComand = new EditorBarComand();
        this.menuBarCommand = new MenuBarCommand();
        this.windowCommand = new WindowCommand();
        this.initKeyMap();
        EventBus.$on('shortcut-loaded', (data) => {
            this.initUserKeyMap(data);
        });
    }
    initKeyMap() {
        for (let key in editorKeyMap) {
            let item = { ...editorKeyMap[key] };
            let _key = key.toLowerCase();
            this.keyMap[_key] = this.keyMap[_key] || [];
            this.keyMap[_key].push(item);
            this.commandMap[item.command] = item;
            item.key = key;
            item.commandObj = this.editorComand;
        }
        for (let key in editorBarKeyMap) {
            let item = { ...editorBarKeyMap[key] };
            let _key = key.toLowerCase();
            this.keyMap[_key] = this.keyMap[_key] || [];
            this.keyMap[_key].push(item);
            this.commandMap[item.command] = item;
            item.key = key;
            item.commandObj = this.editorBarComand;
        }
        for (let key in menuBarKeyMap) {
            let item = { ...menuBarKeyMap[key] };
            let _key = key.toLowerCase();
            this.keyMap[_key] = this.keyMap[_key] || [];
            this.keyMap[_key].push(item);
            this.commandMap[item.command] = item;
            item.key = key;
            item.commandObj = this.menuBarCommand;
        }
        for (let key in windowKeyMap) {
            let item = { ...windowKeyMap[key] };
            let _key = key.toLowerCase();
            this.keyMap[_key] = this.keyMap[_key] || [];
            this.keyMap[_key].push(item);
            this.commandMap[item.command] = item;
            item.key = key;
            item.commandObj = this.windowCommand;
        }
    }
    initUserKeyMap(data) {
        data = data || [];
        for (let i = 0; i < data.length; i++) {
            let item = data[i] || {};
            let key = item.key || '';
            let command = this.findCommandByName(item.command);
            if (command && /^(?:ctrl\+|alt\+|shift\+){0,3}(?:[^\s\n] [^\s\n]|(?:[^\s\n]\+)?[^\s\n])$/i.test(key)) {
                if (key.indexOf(' ') > -1) {
                    key = key.split(' ');
                    // ctrl+k w 需要转换成成 ctrl+k ctrl+w
                    key[1] = key[0].slice(0, -key[1].length) + key[1];
                    key = key[0] + key[1];
                }
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
    findLabelByNmae(command) {
        let key = '';
        command = this.commandMap[command];
        if (command) {
            key = command.key;
        }
        if (key.indexOf(' ') > -1) {
            let i = 0
            key = key.split(' ');
            while (key[0][i] === key[1][i]) {
                i++;
            }
            key = key[0] + ' ' + key[1].slice(i);
        }
        if (key) {
            key = key.split(' ');
            key.forEach((item, index) => {
                let arr = item.split('+');
                for (let i = 0; i < arr.length; i++) {
                    arr[i] = arr[i][0].toUpperCase() + arr[i].slice(1);
                }
                item = arr.join('+');
                key[index] = item;
            });
            key = key.join(' ');
        }
        return key;
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
    onKeydown(e) {
        if (globalData.compositionstart) { //正在输中文，此时不做处理
            return;
        }
        let key = vkeys.getKey(e.keyCode);
        let command = '';
        let keyStr = '';
        if (this.preKeyTimer) {
            clearTimeout(this.preKeyTimer);
        }
        if (this.cKeys.indexOf(key) == -1) {
            key = key.replace('+', 'Add');
            keyStr = this.keys.join('+');
            keyStr = keyStr ? keyStr + '+' + key : key;
            command = this.findCommandByKey(keyStr);
            if (!command && this.prevKeyStr) {
                command = this.findCommandByKey(this.prevKeyStr + ' ' + keyStr)
            }
            if (command) {
                e.stopPropagation();
                e.preventDefault();
                this.doComand(command);
                this.keys = [];
                this.prevKeyStr = '';
                return;
            } else {
                this.prevKeyStr = keyStr;
            }
        }
        if (this.keys.indexOf(key) === -1) {
            this.keys.push(key);
        }
    }
    onKeyup(e) {
        if (this.keys.length) {
            let key = vkeys.getKey(e.keyCode);
            let index = this.keys.indexOf(key);
            this.keys.splice(index, 1);
        }
        if (this.prevKeyStr) {
            // prevKeyStr 两秒后失效
            this.preKeyTimer = setTimeout(() => {
                this.prevKeyStr = '';
            }, 2000);
        }
    }
}