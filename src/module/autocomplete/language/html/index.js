/*
 * @Author: lisong
 * @Date: 2022-02-09 21:33:03
 * @Description: 
 */
import Util from '@/common/Util';
import HtmlData from '@/data/browsers.html-data';

const regs = {
    word: /^[a-zA-Z][a-zA-Z0-9]*$/,
    emmetChar: /\w/,
    emmetWord: /[^\s]+$/,
    emmet: /^[a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?(?:[\>\+][a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?)*$/,
    paremEmmet: /\([a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?(?:[\>\+][a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?)*\)/g,
    invalidEmmetParen: /\)\>/,
}

class Searcher {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
        this.initProperties(editor, context);
        this.initTagData();
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['cursor', 'setAutoTip']);
        Util.defineProperties(this, context, ['htmls']);
    }
    initTagData() {
        this.tagMap = {};
        HtmlData.tags.forEach((item) => {
            this.tagMap[item.name] = item;
        });
    }
    search() {
        let tokenType = _getType.call(this);
        if (tokenType.type === 'tag') {
            this.word = this.getNowWord(tokenType.column);
            if (this.word && this.checkEmmetValid(this.word)) {
                this.setAutoTip([{
                    result: this.word,
                    word: this.word,
                    desc: 'Emmet Abbreviation',
                    type: 'tag.html',
                    icon: 'icon-property',
                    indexs: [],
                    score: 0
                }]);
            }
        }

        function _getType() {
            let cursorPos = this.cursor.multiCursorPos.toArray()[0];
            let line = cursorPos.line;
            let result = {
                type: 'tag',
                column: 0
            };
            while (line >= 1) {
                let tokens = this.htmls[line - 1].tokens;
                if (tokens) {
                    for (let i = tokens.length - 1; i >= 0; i--) {
                        if (line < cursorPos.line || tokens[i].column < cursorPos.column) {
                            if (tokens[i].type === 'punctuation.definition.tag.end.html' ||
                                tokens[i].type === 'punctuation.definition.comment.close.html') {
                                result.type = 'tag';
                                if (line === cursorPos.line && !result.column) {
                                    result.column = tokens[i].column + tokens[i].value.length;
                                }
                                return result;
                            } else if (tokens[i].type === 'plain') {
                                if (line === cursorPos.line && !result.column &&
                                    tokens[i].column + tokens[i].value.length < result.column) {
                                    result.column = tokens[i].column + tokens[i].value.length;
                                }
                            } else {
                                result.type = tokens[i].type;
                                return result;
                            }
                        }
                    }
                }
                line--;
            }
            return result;
        }
    }
    stop() {

    }
    checkEmmetValid(text) {
        let _text = '';
        if (regs.invalidEmmetParen.exec(text)) {
            return false;
        }
        while (text !== (_text = text.replace(regs.paremEmmet, 'a'))) {
            text = _text;
        }
        return !!regs.emmet.exec(text);
    }
    getNowWord(start) {
        let multiCursorPos = this.cursor.multiCursorPos.toArray();
        let line = multiCursorPos[0].line;
        let column = multiCursorPos[0].column;
        let text = this.htmls[line - 1].text;
        if ((!column || text[column - 1].match(/\w/)) &&
            (column === text.length || !text[column].match(regs.emmetChar))) { //当前光标位置必须处于单词边界
            text = text.slice(start, column)
            let word = text.match(regs.emmetWord);
            if (word) {
                word = word[0];
                if (regs.word.test(word)) { //单个单词，判断是否为html标签名
                    if (!this.tagMap[word]) {
                        this.setAutoTip(null);
                        return '';
                    }
                }
                for (let i = 1; i < multiCursorPos.length; i++) {
                    let _cursorPos = multiCursorPos[i];
                    let _word = this.htmls[_cursorPos.line - 1].text.slice(_cursorPos.column - word.length, _cursorPos.column)
                    if (!_word || _word !== word) {
                        this.setAutoTip(null);
                        return '';
                    }
                }

            }
            return word;
        }
        this.setAutoTip(null);
        return '';
    }
}

export default Searcher;