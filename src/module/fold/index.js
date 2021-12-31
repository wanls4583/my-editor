/*
 * @Author: lisong
 * @Date: 2021-12-31 14:42:01
 * @Description: 
 */
import Util from '@/common/util';
export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, context, ['htmls', 'folds', 'foldMap']);
    }
    // 折叠行
    foldLine(line) {
        let startLine = line;
        let resultFold = this.getRangeFold(line);
        if (resultFold) {
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
        let i = 1;
        let realLine = 1;
        let folds = this.folds.slice(0);
        while (folds.length && i < line) {
            if (i + folds[0].start.line - realLine < line) {
                i += folds[0].start.line - realLine;
                realLine = folds[0].end.line - 1;
            } else {
                break;
            }
            let fold = folds.shift();
            while (folds.length && folds[0].end.line <= fold.end.line) { //多级折叠
                folds.shift();
            }
        }
        realLine += line - i;
        return realLine;
    }
    // 根据真实行号获取相对行号
    getRelativeLine(line) {
        let relLine = line;
        let folds = this.folds.slice(0);
        let preFold = null;
        for (let i = 0; i < folds.length; i++) {
            if (line > folds[i].start.line) {
                if (!preFold || preFold.end.line <= folds[i].start.line) {
                    relLine -= folds[i].end.line - folds[i].start.line - 1;
                }
            } else {
                break;
            }
            preFold = folds[i];
        }
        return relLine;
    }
}