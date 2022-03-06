/*
 * @Author: lisong
 * @Date: 2021-12-31 14:42:01
 * @Description: 
 */
import Util from '@/common/Util';
import Btree from '@/common/Btree';

const comparator = function (a, b) {
    return a.start.line - b.start.line;
}

export default class {
    constructor(editor, context) {
        this.folds = new Btree(comparator);
        this.editorFunObj = {};
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this.editorFunObj, editor, ['unFold']);
        Util.defineProperties(this, editor, ['selecter']);
        Util.defineProperties(this, context, ['htmls']);
    }
    onInsertContentAfter(preCursorPos, cursorPos) {
        let folds = this.folds.toArray();
        let afterIndex = Infinity;
        // 历史记录中操作光标在折叠区，需要先展开
        for (let i = 0; i < folds.length; i++) {
            let fold = folds[i];
            if (fold.start.line < preCursorPos.line) {
                if (fold.end.line > preCursorPos.line) {
                    this.editorFunObj.unFold(fold.start.line);
                }
            } else if (fold.start.line > preCursorPos.line) {
                afterIndex = i;
                break;
            }
        }
        if (cursorPos.line > preCursorPos.line) {
            // 更新后面的行号
            for (let i = afterIndex; i < folds.length; i++) {
                folds[i].start.line += cursorPos.line - preCursorPos.line;
                folds[i].end.line += cursorPos.line - preCursorPos.line;
            }
        }
    }
    onDeleteContentAfter(preCursorPos, cursorPos) {
        let folds = this.folds.toArray();
        let afterIndex = Infinity;
        for (let i = 0; i < folds.length; i++) {
            let fold = folds[i];
            if (fold.start.line < preCursorPos.line && fold.end.line > preCursorPos.line ||
                fold.start.line < cursorPos.line && fold.end.line > cursorPos.line) {
                this.editorFunObj.unFold(fold.start.line);
            } else if (fold.start.line > preCursorPos.line) {
                afterIndex = i;
                break;
            }
        }
        if (preCursorPos.line > cursorPos.line) {
            // 更新后面的行号
            for (let i = afterIndex; i < folds.length; i++) {
                folds[i].start.line += cursorPos.line - preCursorPos.line;
                folds[i].end.line += cursorPos.line - preCursorPos.line;
            }
        }
    }
    // 折叠行
    foldLine(line) {
        let resultFold = this.getRangeFold(line);
        if (resultFold) {
            // 避免交叉折叠
            for (let line = resultFold.start.line + 1; line < resultFold.end.line; line++) {
                let fold = this.getFoldByLine(line);
                if (fold) {
                    if (fold.end.line > resultFold.end.line) {
                        this.unFold(line);
                    }
                }
            }
            this.folds.insert(resultFold);
        }
        return resultFold;
    }
    // 展开折叠行
    unFold(line) {
        let fold = this.getFoldByLine(line);
        fold && this.folds.delete(fold);
        return fold;
    }
    getFoldByLine(line) {
        let it = this.folds.search(null, (a, b) => {
            return line - b.start.line;
        }, true);
        let value = null;
        if (it) {
            while ((value = it.next())) {
                if (value.start.line === line) {
                    return value;
                } else if (value.start.line > line) {
                    break;
                }
            }
        }
        return null;
    }
    /**
     * 获取折叠范围
     * @param {Number} line 行号
     * @param {Boolean} foldIconCheck 检测是否显示折叠图标
     */
    getRangeFold(line, foldIconCheck) {
        let stack = [];
        let startLine = line;
        let lineObj = this.htmls[startLine - 1];
        let resultFold = null;
        line++;
        if (lineObj.folds && lineObj.folds.length) {
            for (let i = 0; i < lineObj.folds.length; i++) {
                let fold = lineObj.folds[i];
                if (fold.type == -1) {
                    if (!stack.length || stack.peek().name == fold.name) {
                        stack.push(fold);
                    }
                }
            }
        }
        while (stack.length && line <= this.htmls.length && (!foldIconCheck || line - startLine <= 1)) {
            lineObj = this.htmls[line - 1];
            if (lineObj.folds && lineObj.folds.length) {
                for (let i = 0; i < lineObj.folds.length; i++) {
                    let fold = lineObj.folds[i];
                    if (fold.type == -1) {
                        if (stack.peek().name == fold.name) {
                            stack.push(fold);
                        }
                    } else if (stack.peek().name == fold.name) {
                        if (stack.length == 1) {
                            if (foldIconCheck) {
                                return line - startLine > 1;
                            } else {
                                resultFold = {
                                    start: {
                                        line: startLine,
                                        start: stack.peek().start
                                    },
                                    end: {
                                        line: line,
                                        end: fold.end
                                    },
                                    name: fold.name
                                }
                                stack.pop();
                                break;
                            }
                        }
                        stack.pop();
                    }
                }
            }
            line++;
        }
        return foldIconCheck ? line - startLine > 1 : resultFold;
    }
    // 根据相对行号获取真实行号(折叠后行号会改变)
    getRealLine(line) {
        let i = 0;
        let lineCount = 1;
        let realLine = 1;
        let folds = this.folds.toArray();
        while (i < folds.length && lineCount < line) {
            let fold = folds[i];
            if (lineCount + fold.start.line - realLine < line) {
                lineCount += fold.start.line + 1 - realLine;
                realLine = fold.end.line;
            } else {
                break;
            }
            i++;
            while (i < folds.length && folds[i].end.line <= fold.end.line) { //多级折叠
                i++;
            }
        }
        realLine += line - lineCount;
        return realLine;
    }
    // 根据真实行号获取相对行号
    getRelativeLine(line) {
        let relLine = line;
        let i = 0;
        let folds = this.folds.toArray();
        while (i < folds.length) {
            let fold = folds[i];
            if (line >= fold.end.line) {
                relLine -= fold.end.line - fold.start.line - 1;
            } else {
                break;
            }
            i++;
            while (i < folds.length && folds[i].end.line <= fold.end.line) { //多级折叠
                i++;
            }
        }
        return relLine;
    }
}