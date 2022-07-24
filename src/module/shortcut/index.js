import { editorKeyMap, EditorComand } from './editor';
import { editorBarKeyMap, EditorBarComand } from './editor-bar';
import { menuBarKeyMap, MenuBarCommand } from './menu-bar';
import { windowKeyMap, WindowCommand } from './window';
import globalData from '../../data/globalData';

export default class {
    constructor() {
        this.prevKey = '';
        this.keyMap = {};
        this.commandMap = {};
        this.editorComand = new EditorComand();
        this.editorBarComand = new EditorBarComand();
        this.menuBarCommand = new MenuBarCommand();
        this.windowCommand = new WindowCommand();
        this.initKeyMap();
    }
    initKeyMap() {
        for (let key in editorKeyMap) {
            let item = { ...editorKeyMap[key] };
            this.keyMap[key] = this.keyMap[key] || [];
            this.keyMap[key].push(item);
            this.commandMap[item.command] = item;
            item.key = key;
            item.commandObj = this.editorComand;
        }
        for (let key in editorBarKeyMap) {
            let item = { ...editorBarKeyMap[key] };
            this.keyMap[key] = this.keyMap[key] || [];
            this.keyMap[key].push(item);
            this.commandMap[item.command] = item;
            item.key = key;
            item.commandObj = this.editorBarComand;
        }
        for (let key in menuBarKeyMap) {
            let item = { ...menuBarKeyMap[key] };
            this.keyMap[key] = this.keyMap[key] || [];
            this.keyMap[key].push(item);
            this.commandMap[item.command] = item;
            item.key = key;
            item.commandObj = this.menuBarCommand;
        }
        for (let key in windowKeyMap) {
            let item = { ...windowKeyMap[key] };
            this.keyMap[key] = this.keyMap[key] || [];
            this.keyMap[key].push(item);
            this.commandMap[item.command] = item;
            item.key = key;
            item.commandObj = this.windowCommand;
        }
    }
    findCommandByKey(key) {
        let arr = this.keyMap[key];
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
        if(command) {
            key = command.key;
        }
        if(key.indexOf(' ') > -1) {
            let i=0
            key = key.split(' ');
            while(key[0][i]===key[1][i]) {
                i++;
            }
            key = key[0] + ' ' + key[1].slice(i);
        }
        key = key.replace(/Key/, '');
        return key;
    }
    doComand(command) {
        let editor = globalData.$mainWin.getNowEditor();
        let context = globalData.$mainWin.getNowContext();
        let commandObj = command.commandObj;
        if (command.commandObj) {
            commandObj = command.commandObj;
        } else {
            command = this.findCommandByName(command.command);
            commandObj = command && command.commandObj;
        }
        if (commandObj && commandObj[command.command] && editor && context) {
            if (this.editorComand === commandObj) {
                commandObj.editor = editor;
                commandObj.context = context;
            }
            commandObj[command.command]();
        }
    }
    onKeydown(e) {
        if (globalData.compositionstart) { //正在输中文，此时不做处理
            return;
        }
        let keys = [];
        let key = e.code;
        let command = '';
        if (e.ctrlKey) {
            keys.push('Ctrl');
        }
        if (e.altKey) {
            keys.push('Alt');
        }
        if (e.shiftKey) {
            keys.push('Shift');
        }
        if (keys.indexOf(key) == -1) {
            keys.push(key);
            key = keys.join('+');
            command = this.findCommandByKey(key);
            if (!command && this.prevKey) {
                command = this.findCommandByKey(this.prevKey + ' ' + key)
            }
            if (command) {
                this.doComand(command);
                e.stopPropagation();
                e.preventDefault();
            } else {
                this.prevKey = key;
            }
        }
    }
}