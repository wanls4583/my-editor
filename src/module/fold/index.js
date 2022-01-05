/*
 * @Author: lisong
 * @Date: 2021-12-31 14:42:01
 * @Description: 
 */
import Util from '@/common/Util';
export default class {
    constructor(editor, context) {
        this.editorFunObj = {};
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this.editorFunObj, editor, ['unFold']);
        Util.defineProperties(this, editor, ['selectedRange']);
        Util.defineProperties(this, context, ['htmls', 'folds', 'foldMap']);
    }
    onInsertContentBefore(nowLine) {
        if (this.folds.length) {
            let index = this.findFoldIndex(nowLine);
            let unFolds = [];
            while (index < this.folds.length && this.folds[index].start.line < nowLine && this.folds[index].end.line > nowLine) {
                unFolds.push(this.folds[index].start.line);
                index++;
            }
            unFolds.map((line) => {
                this.editorFunObj.unFold(line);
            });
        }
    }
    onInsertContentAfter(nowLine) {}
    onDeleteContentBefore(nowLine) {
        if (this.selectedRange) {
            let start = this.selectedRange.start;
            let end = this.selectedRange.end;
            for (let line = start.line; line < end.line; line++) { //删除折叠区域
                this.editorFunObj.unFold(line);
            }
        }
    }
    onDeleteContentAfter(nowLine) {
        if (this.folds.length) {
            let index = this.findFoldIndex(nowLine);
            let unFolds = [];
            console.log(index);
            while (index < this.folds.length && this.folds[index].start.line < nowLine && this.folds[index].end.line > nowLine) {
                unFolds.push(this.folds[index].start.line);
                index++;
            }
            unFolds.map((line) => {
                this.editorFunObj.unFold(line);
            });
        }
    }
    /**
     * 寻找第一个包裹nowLine的折叠对象的下标
     * @param {Number} nowLine 
     */
    findFoldIndex(nowLine) {
        let left = 0;
        let right = this.folds.length - 1;
        while (left < right) {
            let mid = Math.floor((left + right) / 2);
            let fold = this.folds[mid];
            if (fold.start.line < nowLine) {
                if (fold.end.line <= nowLine) {
                    left = mid + 1;
                } else {
                    right = mid;
                }
            } else if (fold.start.line == nowLine) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return left;
    }
    // 折叠行
    foldLine(line) {
        let startLine = line;
        let resultFold = this.getRangeFold(line);
        if (resultFold) {
            for (let line = resultFold.start.line; line < resultFold.end.line; line++) {
                if (this.foldMap.has(line)) {
                    if (this.foldMap.get(line).end.line > resultFold.end.line) {
                        this.unFold(line);
                    }
                }
            }
            this.foldMap.set(startLine, resultFold);
            this.folds.push(resultFold);
            this.folds.sort((a, b) => {
                return a.start.line - b.start.line;
            });
        }
        return resultFold;
    }
    // 展开折叠行
    unFold(line) {
        let left = 0;
        let right = this.folds.length;
        if (!this.foldMap.has(line)) {
            return false;
        }
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (this.folds[mid].start.line == line) {
                this.folds.splice(mid, 1);
                break;
            } else if (this.folds[mid].start.line > line) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        this.foldMap.delete(line);
        return true;
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
        while (i < this.folds.length && lineCount < line) {
            if (lineCount + this.folds[i].start.line - realLine < line) {
                lineCount += this.folds[i].start.line - realLine;
                realLine = this.folds[i].end.line - 1;
            } else {
                break;
            }
            let fold = this.folds[i];
            i++;
            while (i < this.folds.length && this.folds[i].end.line <= fold.end.line) { //多级折叠
                i++;
            }
        }
        realLine += line - lineCount;
        return realLine;
    }
    // 根据真实行号获取相对行号
    getRelativeLine(line) {
        let relLine = line;
        let preFold = null;
        for (let i = 0; i < this.folds.length; i++) {
            if (line >= this.folds[i].end.line) {
                if (!preFold || preFold.end.line <= this.folds[i].start.line) {
                    relLine -= this.folds[i].end.line - this.folds[i].start.line - 1;
                }
            } else {
                break;
            }
            preFold = this.folds[i];
        }
        return relLine;
    }
}