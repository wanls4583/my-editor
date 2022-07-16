import Util from '@/common/util';
const regs = {
	line_comment: /comment\.line/,
	block_comment: /comment\.block/
};

export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
    }
    toggleLineComment() {
        let serial = this.context.serial++;
        let historyArr = null;
        let nowIndex = 0;
        let preLine = 0;
        let delPosList = [];
        let addPosList = [];
        let comments = [];
        let afterCursorPosList = [];
        let allCurosrPosList = this.editor.cursor.multiCursorPos.toArray();
        let originCursorPosList = this.context.getOriginCursorPosList();
        while (nowIndex < allCurosrPosList.length) {
            let result = _toggleLineComment.call(this);
            nowIndex = this.moveComentCursor({ result, nowIndex, afterCursorPosList, allCurosrPosList });
        }
        if (delPosList.length) {
            historyArr = this.context._deleteMultiContent({ rangeOrCursorList: delPosList, justDeleteRange: true });
            historyArr.serial = serial;
            historyArr.originCursorPosList = originCursorPosList;
            originCursorPosList = null;
            this.editor.history.pushHistory(historyArr);
        }
        if (addPosList.length) {
            historyArr = this.context._insertMultiContent({ text: comments, cursorPosList: addPosList });
            historyArr.serial = serial;
            if (originCursorPosList) {
                historyArr.originCursorPosList = originCursorPosList;
            }
            this.editor.history.pushHistory(historyArr);
        }
        if (historyArr) {
            historyArr.afterCursorPosList = afterCursorPosList;
            this.context.addCursorList(afterCursorPosList);
        }

        function _toggleLineComment() {
            let token = null;
            let range = null;
            let startRange = null;
            let endRange = null;
            let added = false;
            let deled = false;
            let sourceConfigData = null;
            let blockComment = null;;
            let lineComment = '';
            let comment = '';
            let ending = '';
            let cursorPos = allCurosrPosList[nowIndex++];
            range = this.editor.selecter.getRangeByCursorPos(cursorPos);
            if (range) {
                ending = Util.comparePos(range.start, cursorPos) === 0 ? 'left' : 'right';
                cursorPos = range.start;
            }
            token = this.getTokenByCursorPos(cursorPos);
            sourceConfigData = this.getConfigData(cursorPos);
            if (!sourceConfigData || !sourceConfigData.__comments__) {
                return;
            }
            blockComment = sourceConfigData.__comments__.blockComment;
            lineComment = sourceConfigData.__comments__.lineComment;
            if (range) {
                let allComent = true;
                let startLine = preLine === range.start.line ? preLine + 1 : range.start.line;
                if (lineComment) {
                    for (let line = startLine; line <= range.end.line; line++) {
                        if (!this.context.htmls[line - 1].text.trimLeft().startsWith(lineComment)) {
                            allComent = false;
                            break;
                        }
                    }
                    if (allComent) { //删除单行注释
                        for (let line = startLine; line <= range.end.line; line++) {
                            let text = this.context.htmls[line - 1].text;
                            let spaceLength = text.length - text.trimLeft().length;
                            delPosList.push({
                                start: { line: line, column: spaceLength },
                                end: { line: line, column: spaceLength + lineComment.length }
                            });
                            if (line === range.end.line) {
                                comment = { start: { line: line, column: spaceLength }, comment: lineComment };
                            }
                        }
                        afterCursorPosList.push({
                            start: { line: range.start.line, column: range.start.column - lineComment.length },
                            end: { line: range.end.line, column: range.end.column - lineComment.length },
                            ending: ending
                        });
                        deled = true;
                    } else if (lineComment) { //添加单行注释
                        let start = { line: range.start.line, column: range.start.column };
                        let end = { line: range.end.line, column: range.end.column };
                        let column = Infinity;
                        for (let line = startLine; line <= range.end.line; line++) {
                            let text = this.context.htmls[line - 1].text;
                            let _text = text.trimLeft();
                            let spaceLength = text.length - _text.length;
                            // 和第一行注释对齐
                            column = spaceLength < column ? spaceLength : column;
                            if (!_text.startsWith(lineComment)) {
                                addPosList.push({ line: line, column: 0 });
                                comments.push(lineComment);
                                if (line === start.line) {
                                    start.column += lineComment.length;
                                }
                                if (line === end.line) {
                                    end.column += lineComment.length;
                                    comment = {
                                        start: { line: line, column: range.end.column },
                                        comment: lineComment,
                                        op: 'add'
                                    };
                                    added = true;
                                }
                            }
                        }
                        addPosList.forEach((item) => { item.column = column });
                        afterCursorPosList.push({ start, end, ending });
                    }
                } else { //添加多行块注释
                    let start = { line: range.start.line, column: range.start.column };
                    let end = { line: range.end.line, column: range.end.column };
                    addPosList.push(Object.assign({}, start));
                    addPosList.push(Object.assign({}, end));
                    comment = {
                        start: Object.assign({}, end),
                        comment: blockComment,
                        op: 'add'
                    };
                    start.column += blockComment[0].length;
                    if (start.line === end.line) {
                        end.column += blockComment[0].length;
                    }
                    afterCursorPosList.push({ start, end, ending });
                    comments.push(blockComment[0]);
                    comments.push(blockComment[1]);
                    added = true;
                }
                preLine = range.end.line;
            } else {
                let text = this.context.htmls[cursorPos.line - 1].text;
                let _text = text.trimLeft();
                let spaceLength = text.length - _text.length;
                let afterPos = null;;
                if (token && blockComment && regs.block_comment.test(token.scope)) { //光标在多行注释中，删除多行注释
                    startRange = blockComment[0] && this.findPreBlockComment(cursorPos, blockComment[0]);
                    endRange = blockComment[1] && this.findNextBlockComment(cursorPos, blockComment[1]);
                    if (startRange) {
                        delPosList.push(startRange);
                        endRange && delPosList.push(endRange);
                        if (endRange) {
                            comment = { start: startRange.start, end: endRange.start, comment: blockComment };
                        } else {
                            comment = { start: startRange.start, comment: blockComment[0] }
                        }
                        afterPos = this.getAfterCommentCursor(cursorPos, comment);
                        deled = true;
                    }
                } else if (lineComment && _text.startsWith(lineComment)) { //删除单行注释
                    delPosList.push({
                        start: { line: cursorPos.line, column: spaceLength },
                        end: { line: cursorPos.line, column: spaceLength + lineComment.length },
                    });
                    comment = { start: { line: cursorPos.line, column: spaceLength }, comment: lineComment };
                    afterPos = this.getAfterCommentCursor(cursorPos, comment);
                    deled = true;
                } else if (lineComment) { //添加单行注释
                    addPosList.push({ line: cursorPos.line, column: spaceLength });
                    comments.push(lineComment);
                    comment = {
                        start: { line: cursorPos.line, column: spaceLength },
                        comment: lineComment,
                        op: 'add'
                    };
                    afterPos = this.getAfterCommentCursor(cursorPos, comment);
                    added = true;
                } else if (blockComment) { //添加单行块注释
                    if (blockComment[0] && blockComment[1]) {
                        addPosList.push({ line: cursorPos.line, column: spaceLength });
                        comments.push(blockComment[0]);
                        addPosList.push({ line: cursorPos.line, column: this.context.htmls[cursorPos.line - 1].text.length });
                        comments.push(blockComment[1]);
                        comment = {
                            start: { line: cursorPos.line, column: spaceLength },
                            comment: blockComment[0],
                            op: 'add'
                        };
                        afterPos = this.getAfterCommentCursor(cursorPos, comment);
                        added = true;
                    }
                }
                afterCursorPosList.push(afterPos);
                preLine = cursorPos.line;
            }
            return { added, deled, comment };
        }
    }
    toggleBlockComment() {
        let serial = this.context.serial++;
        let historyArr = null;
        let nowIndex = 0;
        let delPosList = [];
        let addPosList = [];
        let comments = [];
        let afterCursorPosList = [];
        let allCurosrPosList = this.editor.cursor.multiCursorPos.toArray();
        let originCursorPosList = this.context.getOriginCursorPosList();
        while (nowIndex < allCurosrPosList.length) {
            let result = _toggleBlcokComment.call(this);
            nowIndex = this.moveComentCursor({ result, nowIndex, afterCursorPosList, allCurosrPosList });
        }
        if (delPosList.length) {
            historyArr = this.context._deleteMultiContent({ rangeOrCursorList: delPosList, justDeleteRange: true });
            historyArr.serial = serial;
            historyArr.originCursorPosList = originCursorPosList;
            originCursorPosList = null;
            this.editor.history.pushHistory(historyArr);
        }
        if (addPosList.length) {
            historyArr = this.context._insertMultiContent({ text: comments, cursorPosList: addPosList });
            historyArr.serial = serial;
            if (originCursorPosList) {
                historyArr.originCursorPosList = originCursorPosList;
            }
            this.editor.history.pushHistory(historyArr);
        }
        if (historyArr) {
            historyArr.afterCursorPosList = afterCursorPosList;
            this.context.addCursorList(afterCursorPosList);
        }

        function _toggleBlcokComment() {
            let token = null;
            let range = null;
            let startRange = null;
            let endRange = null;
            let added = false;
            let deled = false;
            let sourceConfigData = null;
            let blockComment = null;;
            let comment = '';
            let ending = '';
            let cursorPos = allCurosrPosList[nowIndex++];
            range = this.editor.selecter.getRangeByCursorPos(cursorPos);
            if (range) {
                ending = Util.comparePos(range.start, cursorPos) === 0 ? 'left' : 'right';
                cursorPos = range.start;
            }
            token = this.getTokenByCursorPos(cursorPos);
            sourceConfigData = this.getConfigData(cursorPos);
            if (!sourceConfigData || !sourceConfigData.__comments__) {
                return;
            }
            blockComment = sourceConfigData.__comments__.blockComment;
            if (!blockComment || blockComment.length < 2) {
                return;
            }
            if (token && blockComment && regs.block_comment.test(token.scope)) { //选区在多行注释中，删除多行注释
                startRange = blockComment[0] && this.findPreBlockComment(cursorPos, blockComment[0]);
                endRange = blockComment[1] && this.findNextBlockComment(cursorPos, blockComment[1]);
            }
            if (range) {
                if (startRange && endRange
                    && Util.comparePos(range.start, startRange.start) >= 0
                    && Util.comparePos(range.end, endRange.end) <= 0
                ) { //删除多行快注释
                    comment = { start: startRange.start, end: endRange.start, comment: blockComment };
                    delPosList.push(startRange);
                    delPosList.push(endRange);
                    afterCursorPosList.push({
                        start: this.getAfterCommentCursor(range.start, comment),
                        end: this.getAfterCommentCursor(range.end, comment),
                        ending: ending
                    });
                    deled = true;
                } else { //添加多行块注释
                    let start = Object.assign({}, range.start);
                    let end = Object.assign({}, range.end);
                    addPosList.push(range.start);
                    addPosList.push(range.end);
                    comments.push(blockComment[0]);
                    comments.push(blockComment[1]);
                    comment = { start: range.start, end: range.end, comment: blockComment, op: 'add' };
                    added = true;
                    start.column += blockComment[0].length;
                    if (start.line === end.line) {
                        end.column += blockComment[0].length;
                    }
                    afterCursorPosList.push({ start, end, ending });
                }
            } else {
                let afterPos = null;
                let text = this.context.htmls[cursorPos.line - 1].text;
                let _text = text.trimLeft();
                let spaceLength = text.length - _text.length;
                if (startRange) { //光标在多行注释中，删除多行注释
                    delPosList.push(startRange);
                    endRange && delPosList.push(endRange);
                    if (endRange) {
                        comment = { start: startRange.start, end: endRange.start, comment: blockComment };
                    } else {
                        comment = { start: startRange.start, comment: blockComment[0] }
                    }
                    afterPos = this.getAfterCommentCursor(cursorPos, comment);
                    deled = true;
                } else { //添加单行注释块
                    addPosList.push({ line: cursorPos.line, column: spaceLength });
                    comments.push(blockComment[0]);
                    addPosList.push({ line: cursorPos.line, column: this.context.htmls[cursorPos.line - 1].text.length });
                    comments.push(blockComment[1]);
                    comment = {
                        start: { line: cursorPos.line, column: spaceLength },
                        comment: blockComment[0],
                        op: 'add'
                    };
                    afterPos = this.getAfterCommentCursor(cursorPos, comment);
                    added = true;
                }
                afterCursorPosList.push(afterPos);
            }
            return { added, deled, comment };
        }
    }
    //同一行的选区或光标需要同步移动
    moveComentCursor({
        result,
        nowIndex,
        allCurosrPosList,
        afterCursorPosList
    }) {
        if (result.added || result.deled) {
            let cursorPos = allCurosrPosList[nowIndex];
            let line = result.comment.start.line;
            let endLine = result.comment.end && result.comment.end.line || line;
            while (cursorPos) {
                let range = this.editor.selecter.getRangeByCursorPos(cursorPos);
                if (range) {
                    if (range.start.line >= line && range.start.line <= endLine) {
                        let afterPos = this.getAfterCommentCursor(range.start, result.comment);
                        if (range.start.line === range.end.line) { //该选区不需进行下一次处理
                            afterCursorPosList.push({
                                start: afterPos,
                                end: this.getAfterCommentCursor(range.end, result.comment),
                                ending: Util.comparePos(range.start, cursorPos) === 0 ? 'left' : 'right'
                            });
                            cursorPos = allCurosrPosList[++nowIndex];
                        } else { //该选区还需进行下一次处理
                            range.start = this.getAfterCommentCursor(range.start, result.comment);
                            break;
                        }
                    } else {
                        break;
                    }
                } else if (line === cursorPos.line) {
                    let afterPos = this.getAfterCommentCursor(cursorPos, result.comment);
                    afterCursorPosList.push(afterPos);
                    cursorPos = allCurosrPosList[++nowIndex];
                } else {
                    break;
                }
            }
        }
        return nowIndex
    }
    // 删除/添加注释后，获取新的光标位置
    getAfterCommentCursor(cursorPos, comment) {
        let op = comment.op;
        let start = comment.start;
        let end = comment.end;
        let afterPos = { line: cursorPos.line, column: cursorPos.column };
        comment = comment.comment;
        if (end) {
            if (op === 'add') {
                if (start.line === end.line) {
                    if (cursorPos.line === start.line && cursorPos.column >= start.column) {
                        afterPos.column += comment[0].length + comment[1].length;
                    }
                } else if (start.line === cursorPos.line) {
                    if (cursorPos.column >= start.column) {
                        afterPos.column += comment[0].length;
                    }
                } else if (end.line === cursorPos.line) {
                    if (cursorPos.column >= end.column) {
                        afterPos.column += comment[1].length;
                    }
                }
            } else {
                if (start.line === end.line) {
                    if (cursorPos.line === start.line && cursorPos.column > start.column) {
                        if (cursorPos.column < start.column + comment[0].length) {
                            afterPos.column -= cursorPos.column - start.column;
                        } else if (cursorPos.column < end.column) {
                            afterPos.column -= comment[0].length;
                        } else if (cursorPos.column < end.column + comment[1].length) {
                            afterPos.column -= comment[0].length;
                            afterPos.column -= cursorPos.column - end.column;
                        } else {
                            afterPos.column -= comment[0].length;
                            afterPos.column -= comment[1].length;
                        }
                    }
                } else if (start.line === cursorPos.line) {
                    if (cursorPos.column > start.column) {
                        if (cursorPos.column < start.column + comment[0].length) {
                            afterPos.column -= cursorPos.column - start.column;
                        } else {
                            afterPos.column -= comment[0].length;
                        }
                    }
                } else if (end.line === cursorPos.line) {
                    if (cursorPos.column > end.column) {
                        if (cursorPos.column < end.column + comment[1].length) {
                            afterPos.column -= cursorPos.column - end.column;
                        } else {
                            afterPos.column -= comment[1].length;
                        }
                    }
                }
            }
        } else {
            if (op === 'add') {
                if (start.line === cursorPos.line && cursorPos.column >= start.column) {
                    afterPos.column += comment.length;
                }
            } else {
                if (start.line === cursorPos.line && cursorPos.column > start.column) {
                    if (cursorPos.column < start.column + comment.length) {
                        afterPos.column -= cursorPos.column - start.column;
                    } else {
                        afterPos.column -= comment.length;
                    }
                }
            }
        }
        return afterPos;
    }
    findPreBlockComment(cursorPos, blockComment) {
        let line = cursorPos.line;
        while (line >= 1) {
            let text = this.context.htmls[line - 1].text;
            let index = text.indexOf(blockComment);
            if (index > -1) {
                if (line === cursorPos.line && index >= cursorPos.column) {
                    line--;
                    continue;
                }
                return {
                    start: { line: line, column: index },
                    end: { line: line, column: index + blockComment.length }
                }
            }
            line--;
        }
    }
    findNextBlockComment(cursorPos, blockComment) {
        let line = cursorPos.line;
        while (line <= this.editor.maxLine) {
            let text = this.context.htmls[line - 1].text;
            let index = text.indexOf(blockComment);
            if (index > -1) {
                if (line === cursorPos.line && index + blockComment.length < cursorPos.column) {
                    line++;
                    continue;
                }
                return {
                    start: { line: line, column: index },
                    end: { line: line, column: index + blockComment.length }
                }
            }
            line++;
        }
    }
    getTokenByCursorPos(cursorPos) {
        let tokens = this.context.htmls[cursorPos.line - 1].tokens || [];
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].startIndex < cursorPos.column
                && tokens[i].endIndex >= cursorPos.column) {
                return tokens[i];
            }
        }
    }
    getConfigData(cursorPos) {
        let token = _getNearToken.call(this, cursorPos);
        if (token) {
            let language = Util.getLanguageById(this.editor.language);
            let grammarData = language && globalData.grammars[language.scopeName];
            if (grammarData) {
                let scopeNames = token.scope.match(grammarData.scopeNamesReg);
                if (scopeNames) {
                    // 一种语言中可能包含多种内嵌语言，优先处理内嵌语言
                    for (let i = scopeNames.length - 1; i >= 0; i--) {
                        if (grammarData.sourceConfigMap[scopeNames[i]]) {
                            return grammarData.sourceConfigMap[scopeNames[i]];
                        }
                    }
                }
            }
        }

        function _getNearToken(cursorPos) {
            let line = cursorPos.line;
            let tokens = this.context.htmls[line - 1].tokens || [];
            for (let i = 0; i < tokens.length; i++) {
                if (tokens[i].startIndex <= cursorPos.column
                    && tokens[i].endIndex >= cursorPos.column) {
                    return tokens[i];
                }
            }
            while (--line >= 1) {
                tokens = this.context.htmls[line - 1].tokens;
                if (!tokens) {
                    break;
                }
                if (tokens.length) {
                    return tokens.peek();
                }
            }
            line = cursorPos.line;
            while (++line >= 1) {
                tokens = this.context.htmls[line - 1].tokens;
                if (!tokens) {
                    break;
                }
                if (tokens.length) {
                    return tokens[0];
                }
            }
        }
    }
}