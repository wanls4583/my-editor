/*
 * @Author: lisong
 * @Date: 2022-02-09 21:33:03
 * @Description: 
 */
import Util from '@/common/Util';
const regs = {
    word: /[^\s]+$/,
    emmet: /^[a-zA-Z][a-zA-Z0-9\-]*(?:\*\d+)?(?:[\>\+][a-zA-Z][a-zA-Z0-9\-]*(?:\*\d+)?)*$/,
    paremEmmet: /\([a-zA-Z][a-zA-Z0-9\-]*(?:\*\d+)?(?:[\>\+][a-zA-Z][a-zA-Z0-9\-]*(?:\*\d+)?)*\)/g,
}

class Searcher {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['cursor', 'setAutoTip']);
        Util.defineProperties(this, context, ['htmls']);
    }
    search() {
        let tokenType = _getType.call(this);
        if (tokenType.type === 'tag') {
            this.word = this.getNowWord(tokenType.column);
            if (this.word && this.checkEmmetValid(this.word)) {
                this.setAutoTip([{
                    result: this.word,
                    word: this.word,
                    type: 'tag.html',
                    icon: 'icon-emmet',
                    indexs: [],
                    score: 0
                }]);
            }
        }

        function _getType() {
            let cursorPos = this.cursor.multiCursorPos.toArray()[0];
            let line = cursorPos.line;
            let result = {
                type: ''
            };
            while (line >= 1) {
                let tokens = this.htmls[line - 1].tokens;
                if (tokens && !tokens.length && states && !states.length) {
                    return 'tag';
                } else if (tokens) {
                    for (let i = tokens.length - 1; i >= 0; i--) {
                        if (line < cursorPos.line || tokens[i].column < cursorPos.column) {
                            if (tokens[i].type === 'punctuation.definition.tag.end.html' ||
                                tokens[i].type === 'punctuation.definition.comment.close.html') {
                                result.type = 'tag';
                                result.column = tokens[i].column + tokens[i].value.length;
                                return result;
                            } else if (tokens[i].type !== 'plain') {
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
        while (text !== (_text = text.replace(regs.paremEmmet, 'a'))) {
            text = _text;
        }
        return !!regs.emmet.exec(text);
    }
    getNowWord(start) {
        let multiCursorPos = this.cursor.multiCursorPos.toArray();
        let cursorPos = multiCursorPos[0];
        let text = this.htmls[cursorPos.line - 1].text.slice(start, cursorPos.column);
        let word = text.match(regs.word);
        if (word) {
            word = word[0];
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
}

export default Searcher;