import Util from '@/common/util';

export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
    }
    convertTabToSpace(command) {
        let contentChanged = false;
        let tabSize = this.editor.tabSize;
        let space = this.editor.space;
        if (command) {
            tabSize = command.tabSize;
            space = command.space;
        }
        this.editor.cursor.multiCursorPos.forEach(cursorPos => {
            _checkPos.call(this, cursorPos);
        });
        this.editor.selecter.ranges.forEach(range => {
            _checkPos.call(this, range.start);
            _checkPos.call(this, range.end);
        });
        this.editor.fSelecter.ranges.forEach(range => {
            _checkPos.call(this, range.start);
            _checkPos.call(this, range.end);
        });
        this.editor.folder.folds.forEach(fold => {
            let text = this.context.htmls[fold.start.line - 1].text;
            let tabCount = _getTabNum(text);
            if (tabCount) {
                tabCount = tabCount * (tabSize - 1);
                fold.start.startIndex += tabCount;
                fold.start.endIndex += tabCount;
            }
            text = this.context.htmls[fold.end.line - 1].text;
            tabCount = _getTabNum(text);
            if (tabCount) {
                tabCount = tabCount * (tabSize - 1);
                fold.end.startIndex += tabCount;
                fold.end.endIndex += tabCount;
            }
        });
        this.context.htmls.forEach(lineObj => {
            let tabCount = _getTabNum(lineObj.text);
            tabCount = tabCount * (tabSize - 1);
            if (tabCount > 0) {
                if (lineObj.tokens) {
                    lineObj.tokens.forEach((token, index) => {
                        if (index > 0) {
                            token.startIndex += tabCount;
                        }
                        token.endIndex += tabCount;
                    });
                }
                if (lineObj.folds) {
                    lineObj.folds.forEach(fold => {
                        fold.startIndex += tabCount;
                        fold.endIndex += tabCount;
                    });
                }
                if (lineObj.stateFold) {
                    lineObj.stateFold.startIndex += tabCount;
                    lineObj.stateFold.endIndex += tabCount;
                }
                lineObj.text = lineObj.text.replace(/(?<=^\s*)\t/g, space);
                lineObj.html = '';
                lineObj.tabNum = -1;
                contentChanged = true;
            }
        });
        if (contentChanged) {
            this.context.contentChanged();
            EventBus.$emit('indent-change', 'space');
            this.editor.tabData.status !== '!!' && this.editor.differ.run();
            this.context.render();
            if (command) {
                this.editor.history.updateHistory({ type: Util.HISTORY_COMMAND.SPACE_TO_TAB, tabSize, space });
            } else {
                this.editor.history.pushHistory({ type: Util.HISTORY_COMMAND.SPACE_TO_TAB, tabSize, space });
            }
        }

        function _getTabNum(text) {
            let tabNum = 0;
            let res = /^\s+/.exec(text);
            if (res) {
                res = res[0];
                for (let i = 0; i < res.length; i++) {
                    if (res[i] === '\t') {
                        tabNum++;
                    }
                }
            }
            return tabNum;
        }

        function _checkPos(cursorPos) {
            let text = this.context.htmls[cursorPos.line - 1].text.slice(0, cursorPos.column);
            let tabCount = _getTabNum(text);
            if (tabCount) {
                tabCount = tabCount * (tabSize - 1);
                cursorPos.column += tabCount;
            }
        }
    }
    convertSpaceToTab(command) {
        let contentChanged = false;
        let tabSize = this.editor.tabSize;
        let space = this.editor.space;
        if (command) {
            tabSize = command.tabSize;
            space = command.space;
        }
        let indexReg = new RegExp(`^(\\t|${space})+`);
        let reg = new RegExp(`(?<=^\\s*)${space}`, 'g');
        this.editor.cursor.multiCursorPos.forEach(cursorPos => {
            _checkPos.call(this, cursorPos);
        });
        this.editor.selecter.ranges.forEach(range => {
            _checkPos.call(this, range.start);
            _checkPos.call(this, range.end);
        });
        this.editor.fSelecter.ranges.forEach(range => {
            _checkPos.call(this, range.start);
            _checkPos.call(this, range.end);
        });
        this.editor.folder.folds.forEach(fold => {
            let text = this.context.htmls[fold.start.line - 1].text;
            let tabCount = _getTabNum(text);
            if (tabCount) {
                tabCount = tabCount * (tabSize - 1);
                fold.start.startIndex -= tabCount;
                fold.start.endIndex -= tabCount;
            }
            text = this.context.htmls[fold.end.line - 1].text;
            tabCount = _getTabNum(text);
            if (tabCount) {
                tabCount = tabCount * (tabSize - 1);
                fold.end.startIndex -= tabCount;
                fold.end.endIndex -= tabCount;
            }
        });
        this.context.htmls.forEach(lineObj => {
            let tabCount = _getTabNum(lineObj.text);
            tabCount = tabCount * (tabSize - 1);
            if (tabCount > 0) {
                if (lineObj.tokens) {
                    lineObj.tokens.forEach((token, index) => {
                        if (index > 0) {
                            token.startIndex -= tabCount;
                        }
                        token.endIndex -= tabCount;
                    });
                }
                if (lineObj.folds) {
                    lineObj.folds.forEach(fold => {
                        fold.startIndex -= tabCount;
                        fold.endIndex -= tabCount;
                    });
                }
                if (lineObj.stateFold) {
                    lineObj.stateFold.startIndex -= tabCount;
                    lineObj.stateFold.endIndex -= tabCount;
                }
                lineObj.text = lineObj.text.replace(reg, '\t');
                lineObj.html = '';
                lineObj.tabNum = -1;
                contentChanged = true;
            }
        });
        if (contentChanged) {
            this.context.contentChanged();
            EventBus.$emit('indent-change', 'tab');
            this.editor.tabData.status !== '!!' && this.editor.differ.run();
            this.context.render();
            if (command) {
                this.editor.history.updateHistory({ type: Util.HISTORY_COMMAND.TAB_TO_SPACE, tabSize, space });
            } else {
                this.editor.history.pushHistory({ type: Util.HISTORY_COMMAND.TAB_TO_SPACE, tabSize, space });
            }
        }

        function _getTabNum(text) {
            let tabNum = 0;
            let res = text.match(reg);
            tabNum = res && res.length;
            return tabNum;
        }

        function _checkPos(cursorPos) {
            let text = this.context.htmls[cursorPos.line - 1].text;
            let preText = text.slice(0, cursorPos.column);
            let tabCount = _getTabNum(preText);
            tabCount = tabCount * (tabSize - 1);
            if (tabCount) {
                let index = indexReg.exec(preText)[0].length;
                if (cursorPos.column > index && text.slice(index, index + 4) === space) {
                    cursorPos.column = index - tabCount + 1;
                } else {
                    cursorPos.column -= tabCount;
                }
            }
        }
    }
    addAnIndent() {
        let preLine = -1;
        let historyArr = null;
        let cursorPosList = [];
        let afterCursorPosList = [];
        let originCursorPosList = this.context.getOriginCursorPosList();
        let text = this.editor.indent === 'tab' ? '\t' : Util.space(this.editor.tabSize);
        let charSize = this.editor.indent === 'tab' ? 1 : this.editor.tabSize;
        this.editor.cursor.multiCursorPos.forEach((item) => {
            let range = this.editor.selecter.getRangeByCursorPos(item);
            if (range) {
                if (preLine !== range.start.line) {
                    for (let line = range.start.line; line <= range.end.line; line++) {
                        cursorPosList.push({ line: line, column: 0 });
                    }
                }
                afterCursorPosList.push({
                    start: { line: range.start.line, column: range.start.column + charSize },
                    end: { line: range.end.line, column: range.end.column + charSize },
                    ending: Util.comparePos(range.start, range) === 0 ? 'left' : 'right'
                })
                preLine = range.start.line;
            } else {
                if (preLine !== item.line) {
                    cursorPosList.push({ line: item.line, column: 0 });
                }
                afterCursorPosList.push({
                    line: item.line,
                    column: item.column + charSize
                });
            }
        });
        historyArr = this.context._insertMultiContent({ text: text, cursorPosList });
        historyArr.originCursorPosList = originCursorPosList;
        historyArr.originScrollTop = this.editor.scrollTop;
        historyArr.afterCursorPosList = afterCursorPosList;
        this.context.addCursorList(afterCursorPosList);
        this.editor.history.pushHistory(historyArr);
    }
    removeAnIndent() {
        let preLine = -1;
        let historyArr = null;
        let cursorPosList = [];
        let afterCursorPosList = [];
        let originCursorPosList = this.context.getOriginCursorPosList();
        this.editor.cursor.multiCursorPos.forEach((item) => {
            let range = this.editor.selecter.getRangeByCursorPos(item);
            if (range) {
                let afterStart = { line: range.start.line, column: range.start.column };
                let afterEnd = { line: range.end.line, column: range.end.column };
                let ending = Util.comparePos(range.start, range) === 0 ? 'left' : 'right';
                if (preLine !== range.start.line) {
                    for (let line = range.start.line; line <= range.end.line; line++) {
                        let charSize = _getCharSize.call(this, line);
                        if (charSize) {
                            cursorPosList.push({
                                start: { line: line, column: 0 },
                                end: { line: line, column: charSize }
                            });
                            if (line === afterStart.line) {
                                afterStart.column -= charSize;
                            }
                            if (line === afterEnd.line) {
                                afterEnd.column -= charSize;
                            }
                        }
                    }
                }
                afterCursorPosList.push({ start: afterStart, end: afterEnd, ending: ending });
                preLine = range.start.line;
            } else {
                let afterPos = { line: item.line, column: item.column }
                if (preLine !== item.line) {
                    let charSize = _getCharSize.call(this, item.line);
                    if (charSize) {
                        cursorPosList.push({
                            start: { line: item.line, column: 0 },
                            end: { line: item.line, column: charSize }
                        });
                        afterPos.column -= charSize;
                    }
                }
                afterCursorPosList.push(afterPos);
            }
        });
        historyArr = this.context._deleteMultiContent({ rangeOrCursorList: cursorPosList });
        historyArr.originCursorPosList = originCursorPosList;
        historyArr.originScrollTop = this.editor.scrollTop;
        historyArr.afterCursorPosList = afterCursorPosList;
        this.context.addCursorList(afterCursorPosList);
        this.editor.history.pushHistory(historyArr);

        function _getCharSize(line) {
            let text = this.context.htmls[line - 1].text;
            let charSize = 0;
            for (let i = 0; i < this.editor.tabSize; i++) {
                if (text[i] === ' ') {
                    charSize++;
                } else if (text[i] === '\t') {
                    charSize++;
                    break;
                } else {
                    break;
                }
            }
            return charSize;
        }
    }
}