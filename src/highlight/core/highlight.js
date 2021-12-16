/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description: 
 */
export default function () {
    const ENUM = {
        PAIR_START: -1,
        PAIR_START_END: 0,
        PAIR_END: 1,
        FOLD_OPEN: 1,
        FOLD_CLOSE: -1,
        DEFAULT: 'default'
    }

    const KEYCODE = {
        DELETE: 46,
        BACKSPACE: 8
    }

    function Highlight() {
        this.uuid = Number.MIN_SAFE_INTEGER + 1;
        this.uuidMap = new Map(); // htmls的唯一标识对象
        this.htmls = [{
            uuid: Number.MIN_SAFE_INTEGER,
            text: '',
            html: '',
            width: 0,
            token: '',
            highlight: {
                pairTokens: null,
                validPairTokens: null
            }
        }];
        self.onmessage = (e) => {
            let type = e.data.type;
            let data = e.data.data;
            switch (type) {
                case 'initData':
                    this.initData(data);
                    break;
                case 'insertContent':
                    this.insertContent(data.text, data.cursorPos);
                    break;
                case 'deleteContent':
                    this.deleteContent(data.keyCode, data.selectedRange, data.cursorPos);
                    break;
                case 'highlightToken':
                    this.highlightToken(data.startLine);
            }
        }
    }

    Highlight.prototype.initData = function (option) {
        this.maxVisibleLines = option.maxVisibleLines;
        this.rulesObj = option.rulesObj;
        if (option.main) {
            this.main = option.main;
            Object.defineProperty(this, 'htmls', {
                get() {
                    return option.main.htmls;
                }
            });
        }
        this.initRules();
    }

    Highlight.prototype.initRules = function () {
        let that = this;
        this.pairRules = [];
        this.singleRules = [];
        this.excludeRules = [];
        this.ruleNameMap = {};
        this.startNameMap = {};
        this.ruleUuidMap = {};
        this.rulesObj.rules.map((item) => {
            _initRules(item);
        });
        _getExclueRules(this.rulesObj.rules);

        function _initRules(item) {
            that.ruleUuidMap[item.uuid] = item;
            if (typeof item.name == 'string') {
                that.ruleNameMap[item.name] = item;
            }
            if (typeof item.start == 'string') {
                that.startNameMap[item.start] = item;
            }
            if (item.regex && !item.start) {
                that.singleRules.push(item);
            } else {
                that.pairRules.push(item);
            };
            if (item.childRule && item.childRule.rules) {
                item.childRule.rules.map((_item) => {
                    _initRules(_item);
                });
                _getExclueRules(item.childRule.rules);
            }
        }

        function _getExclueRules(rules) {
            let pairTokensMap = new Map();
            let minLevel = Infinity;
            let pairRules = rules.filter((item) => {
                return item.start && item.next;
            });
            pairRules.map((item) => {
                minLevel = minLevel > item.level ? item.level : minLevel;
                item.token && pairTokensMap.set(item.token, true);
            });
            rules = rules.filter((item) => {
                return item.level >= minLevel && !item.start && !pairTokensMap.has(item.token);
            });
            that.excludeRules = that.excludeRules.concat(rules);
        }
    }

    // 插入内容
    Highlight.prototype.insertContent = function (text, cursorPos) {
        let nowLineText = this.htmls[cursorPos.line - 1].text;
        let nowColume = cursorPos.column;
        text = text.replace(/\t/g, this.space);
        text = text.split(/\r\n|\n/);
        text = text.map((item) => {
            return {
                uuid: this.uuid++,
                text: item,
                highlight: {
                    pairTokens: null,
                    validPairTokens: null
                }
            }
        });
        if (text.length > 1) { // 插入多行
            text[0].text = nowLineText.slice(0, nowColume) + text[0].text;
            text[0].html = text[0].text;
            text[text.length - 1].text = text[text.length - 1].text + nowLineText.slice(nowColume);
            text[text.length - 1].html = text[text.length - 1].text;
            this.htmls = this.htmls.slice(0, cursorPos.line - 1).concat(text).concat(this.htmls.slice(cursorPos.line));
        } else { // 插入一行
            text[0].text = nowLineText.slice(0, nowColume) + text[0].text + nowLineText.slice(cursorPos.column);
            text[0].html = text[0].text;
            this.htmls.splice(cursorPos.line - 1, 1, text[0]);
        }
        this.nowPairLine = this.nowPairLine > cursorPos.line ? cursorPos.line : this.nowPairLine;
    }

    // 删除内容
    Highlight.prototype.deleteContent = function (keyCode, selectedRange, cursorPos) {
        let start = null;
        let startObj = this.htmls[cursorPos.line - 1];
        let text = startObj.text;
        if (selectedRange) { // 删除选中区域
            let end = selectedRange.end;
            let endObj = this.htmls[end.line - 1];
            start = selectedRange.start;
            startObj = this.htmls[start.line - 1];
            text = startObj.text;
            if (start.line == 1 && end.line == this.maxLine) { //全选删除
                rangeUuid = [this.maxWidthObj.uuid];
            } else {
                rangeUuid = this.htmls.slice(start.line - 1, end.line).map((item) => {
                    return item.uuid;
                });
            }
            if (start.line == end.line) { // 单行选中
                text = text.slice(0, start.column) + text.slice(end.column);
                startObj.text = text;
                ifOneLine = true;
            } else { // 多行选中
                text = text.slice(0, start.column);
                startObj.text = text;
                text = endObj.text;
                text = text.slice(end.column);
                startObj.text += text;
                this.htmls.splice(start.line, end.line - start.line);
            }
        } else if (KEYCODE.DELETE == keyCode) { // 向后删除一个字符
            if (cursorPos.column == text.length) { // 光标处于行尾
                if (cursorPos.line < this.htmls.length) {
                    text = startObj.text + this.htmls[cursorPos.line].text;
                    this.htmls.splice(cursorPos.line, 1);
                }
            } else {
                text = text.slice(0, cursorPos.column) + text.slice(cursorPos.column + 1);
                ifOneLine = true;
            }
            startObj.text = text;
        } else { // 向前删除一个字符
            if (cursorPos.column == 0) { // 光标处于行首
                if (cursorPos.line > 1) {
                    text = this.htmls[cursorPos.line - 2].text + text;
                    this.htmls.splice(cursorPos.line - 2, 1);
                }
            } else {
                text = text.slice(0, cursorPos.column - 1) + text.slice(cursorPos.column);
                ifOneLine = true;
            }
            startObj.text = text;
        }
        startObj.highlight = {
            pairTokens: null,
            validPairTokens: null
        }
        if (selectedRange) {
            this.nowPairLine = this.nowPairLine > start.line ? start.line : this.nowPairLine;
        } else {
            this.nowPairLine = this.nowPairLine > cursorPos.line - 1 ? cursorPos.line - 1 : this.nowPairLine;
        }
    }

    /**
     * 高亮单行匹配
     */
    Highlight.prototype.highlightToken = function (startLine) {
        let tokens = {};
        let lineObj = null;
        let nowLine = startLine;
        let endLine = startLine + this.maxVisibleLines;
        nowLine = nowLine < 1 ? 1 : nowLine;
        endLine = endLine > this.htmls.length ? this.htmls.length : endLine;
        tokens[ENUM.DEFAULT] = [];
        this.startLine = startLine;
        while (nowLine <= endLine) {
            lineObj = this.htmls[nowLine - 1];
            if (!lineObj.highlight.tokens) {
                lineObj.text && (tokens = this.getLineTokens(lineObj.text));
                lineObj.highlight.tokens = tokens;
            } else {
                tokens = lineObj.highlight.tokens;
            }
            // 这里不需要加tokens.length的判断条件，可能只是validPairTokens有变化，需要更新
            if (!lineObj.highlight.rendered) {
                this.buildHtml(nowLine);
            }
            nowLine++;
        }
    }

    Highlight.prototype.getLineTokens = function (text) {
        let tokens = {};
        let result = null;
        tokens[ENUM.DEFAULT] = [];
        this.singleRules.map((rule) => {
            while (result = rule.regex.exec(text)) {
                let key = rule.parentUuid || ENUM.DEFAULT;
                tokens[key] = tokens[key] || [];
                tokens[key].push({
                    uuid: rule.uuid,
                    value: result[0],
                    level: rule.level,
                    start: result.index,
                    end: result.index + result[0].length
                });
                if (!result[0].length || !rule.regex.global) {
                    break;
                }
            }
            rule.regex.lastIndex = 0;
        });
        Object.values(tokens).map((tokens) => {
            tokens.sort((a, b) => {
                if (a.start - b.start == 0) {
                    return b.level - a.level;
                }
                return a.start - b.start;
            });
        });
        return tokens;
    }

    Highlight.prototype.buildHtml = function (line) {
        let lineObj = this.htmls[line - 1];
        // 子线程
        if (line < this.startLine || line > this.startLine + this.maxVisibleLines) {
            return;
        }
        if (this.main) { // 主线程
            this.main.buildHtml(lineObj);
            lineObj.highlight.rendered = true;
        } else { // 子线程
            self.postMessage({
                type: 'buildHtml',
                data: {
                    lineObjs: lineObj
                }
            });
        }
    }

    return new Highlight();
}