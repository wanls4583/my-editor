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

    Array.prototype.peek = function () {
        if (this.length) {
            return this[this.length - 1];
        }
    }

    function Highlight() {
        this.uuid = Number.MIN_SAFE_INTEGER;
        this.uuidMap = new Map(); // htmls的唯一标识对象
        this.nowPairLine = 1;
        this.startToEndToken = null;
        this.htmls = [{
            uuid: this.uuid++,
            text: '',
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
                case 'highlightPairToken':
                    this.startHighlightPairToken(data);
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
            text[text.length - 1].text = text[text.length - 1].text + nowLineText.slice(nowColume);
            this.htmls = this.htmls.slice(0, cursorPos.line - 1).concat(text).concat(this.htmls.slice(cursorPos.line));
        } else { // 插入一行
            text[0].text = nowLineText.slice(0, nowColume) + text[0].text + nowLineText.slice(cursorPos.column);
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
        this.nowPairLine = this.nowPairLine || 1;
    }

    /**
     * 高亮单行匹配
     */
    Highlight.prototype.highlightToken = function (startLine) {
        let tokens = null;
        let lineObj = null;
        let nowLine = startLine;
        let endLine = startLine + this.maxVisibleLines;
        nowLine = nowLine < 1 ? 1 : nowLine;
        endLine = endLine > this.htmls.length ? this.htmls.length : endLine;
        while (nowLine <= endLine) {
            tokens = {};
            tokens[ENUM.DEFAULT] = [];
            lineObj = this.htmls[nowLine - 1];
            if (!lineObj.highlight.tokens) {
                lineObj.text && (tokens = this.getLineTokens(lineObj.text));
                lineObj.highlight.tokens = tokens;
            }
            if (!lineObj.highlight.rendered) {
                this.main.buildHtml(lineObj);
                lineObj.highlight.rendered = true;
            }
            nowLine++;
        }
    }

    /**
     * 获取单行匹配的token
     * @param {String} text 
     */
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

    /**
     * 获取多行匹配的token
     * @param {String} text 
     */
    Highlight.prototype.getPairTokens = function (text) {
        let excludeTokens = {};
        let pairTokens = [];
        let resultMap = new Map(); //缓存相同的正则
        let result = null;
        excludeTokens[ENUM.DEFAULT] = [];
        this.excludeRules.map((rule) => {
            let key = rule.parentUuid || ENUM.DEFAULT;
            let token = null;
            let tokens = [];
            excludeTokens[key] = excludeTokens[key] || [];
            if (resultMap.has(rule.regex.source)) {
                tokens = resultMap.get(rule.regex.source);
                tokens.map((token) => {
                    token = Object.assign({}, token);
                    token.uuid = rule.uuid;
                    token.token = rule.token;
                    token.level = rule.level;
                    excludeTokens[key].push(token);
                });
            } else {
                while (result = rule.regex.exec(text)) {
                    token = {
                        uuid: rule.uuid,
                        token: rule.token,
                        level: rule.level,
                        value: result[0],
                        start: result.index,
                        end: result.index + result[0].length
                    };
                    tokens.push(token);
                    excludeTokens[key].push(token);
                    if (!result[0].length || !rule.regex.global) {
                        break;
                    }
                }
                resultMap.set(rule.regex.source, tokens);
                rule.regex.lastIndex = 0;
            }
        });
        this.pairRules.map((rule) => {
            let isSame = rule.start.source === rule.next.source;
            if (rule.start instanceof RegExp) {
                let pairToken = null;
                let tokens = [];
                if (resultMap.has(rule.start.source)) {
                    tokens = resultMap.get(rule.start.source);
                    tokens.map((pairToken) => {
                        pairToken = Object.assign({}, pairToken);
                        pairToken.uuid = rule.uuid;
                        pairToken.token = rule.token;
                        pairToken.level = rule.level;
                        pairToken.type = isSame ? ENUM.PAIR_START_END : ENUM.PAIR_START;
                        pairTokens.push(pairToken);
                    });
                } else {
                    while (result = rule.start.exec(text)) {
                        pairToken = {
                            uuid: rule.uuid,
                            token: rule.token,
                            level: rule.level,
                            value: result[0],
                            start: result.index,
                            end: result.index + result[0].length,
                            type: isSame ? ENUM.PAIR_START_END : ENUM.PAIR_START
                        };
                        tokens.push(pairToken);
                        pairTokens.push(pairToken);
                        if (!result[0].length || !rule.start.global) {
                            break;
                        }
                    }
                    resultMap.set(rule.start.source, tokens);
                    rule.start.lastIndex = 0;
                }
            }
            if (!isSame && rule.next instanceof RegExp) {
                let pairToken = null;
                let tokens = [];
                if (resultMap.has(rule.next.source)) {
                    tokens = resultMap.get(rule.next.source);
                    tokens.map((pairToken) => {
                        pairToken = Object.assign({}, pairToken);
                        pairToken.uuid = rule.uuid;
                        pairToken.token = rule.token;
                        pairToken.level = rule.level;
                        pairToken.type = isSame ? ENUM.PAIR_START_END : ENUM.PAIR_END;
                        pairTokens.push(pairToken);
                    });
                } else {
                    while (result = rule.next.exec(text)) {
                        pairToken = {
                            uuid: rule.uuid,
                            token: rule.token,
                            level: rule.level,
                            value: result[0],
                            start: result.index,
                            end: result.index + result[0].length,
                            type: isSame ? ENUM.PAIR_START_END : ENUM.PAIR_END
                        };
                        tokens.push(pairToken);
                        pairTokens.push(pairToken);
                        if (!result[0].length || !rule.next.global) {
                            break;
                        }
                    }
                    resultMap.set(rule.next.source, tokens);
                    rule.next.lastIndex = 0;
                }
            }
        });
        Object.values(excludeTokens).map((item) => {
            item.sort((a, b) => {
                if (a.start - b.start == 0) {
                    return b.level - a.level;
                }
                return a.start - b.start;
            });
        });
        pairTokens.sort((a, b) => {
            if (a.start - b.start == 0) {
                return b.level - a.level;
            }
            return a.start - b.start;
        });
        return {
            excludeTokens: excludeTokens,
            pairTokens: pairTokens
        }
    }

    // 子线程处理完部分数据，可以开始高亮多行匹配
    Highlight.prototype.startHighlightPairToken = function (startLine, max) {
        this.startLine = startLine;
        this.startToken = null; // 原始开始节点
        this.parentTokens = [];
        this.preEndToken = null;
        if (this.nowPairLine <= this.htmls.length) {
            this.nowPairLine = this.getStartPairLine();
            this.highlightPairToken(max);
        } else {
            this.notify();
        }
    }

    // 通知主线程当前渲染区域的变化
    Highlight.prototype.notify = function () {
        let lineObjs = [];
        let nowLine = this.startLine;
        let endLine = this.startLine + this.maxVisibleLines;
        nowLine = nowLine < 1 ? 1 : nowLine;
        endLine = endLine > this.htmls.length ? this.htmls.length : endLine;
        while (nowLine <= endLine) {
            let lineObj = this.htmls[nowLine - 1];
            if (!lineObj.highlight.rendered) {
                lineObjs.push(lineObj);
                lineObj.highlight.rendered = true;
            }
            nowLine++;
        }
        if (this.main) {
            lineObjs.map((lineObj) => {
                this.main.buildHtml(lineObj);
            });
        } else {
            self.postMessage({
                type: 'buildHtml',
                data: {
                    lineObjs: lineObjs,
                    startToEndToken: this.startToEndToken,
                    nowPairLine: this.nowPairLine
                }
            });
        }
    }

    // 高亮多行匹配
    Highlight.prototype.highlightPairToken = function (max) {
        let count = 0;
        let length = this.htmls.length;
        max = max || 5000;
        while (count < max && this.nowPairLine <= length) {
            let lineObj = this.htmls[this.nowPairLine - 1];
            let pairTokens = null;
            let excludeTokens = null; // 和多行匹配相同优先级不同类型的单行tokens
            if (!lineObj.highlight.pairTokens) {
                let obj = this.getPairTokens(lineObj.text);
                lineObj.highlight.pairTokens = obj.pairTokens;
                lineObj.highlight.excludeTokens = obj.excludeTokens;
            }
            pairTokens = lineObj.highlight.pairTokens;
            excludeTokens = lineObj.highlight.excludeTokens;
            lineObj.highlight.validPairTokens = [];
            lineObj.highlight.rendered = false;
            // 记录父节点，用于渲染相应的单行tokens
            lineObj.parentRuleUuid = this.parentTokens.length && this.parentTokens.peek().uuid || null;
            // 已有开始节点，则该行可能被其包裹
            lineObj.ruleUuid = this.startToken && this.startToken.uuid || '';
            pairTokens = pairTokens.concat([]);
            while (pairTokens.length) {
                let endToken = null;
                let originToken = null;
                // 获取开始节点
                if (!this.startToken) {
                    this.startToken = this.getNextStartToken(excludeTokens, pairTokens);
                    if (this.startToken) {
                        originToken = this.startToken;
                        this.startToken = Object.assign({}, this.startToken);
                        this.startToken.originToken = originToken;
                        if (this.parentTokens.length && this.parentTokens.peek().uuid == this.startToken.uuid) { // 找到的是父节点的结束节点
                            endToken = this.startToken;
                            this.startToken = this.parentTokens.pop();
                        } else {
                            let rule = this.ruleUuidMap[this.startToken.uuid];
                            this.preEndToken = null;
                            this.startToken.line = this.nowPairLine;
                            this.startToken._start = this.startToken.start;
                            this.startToken._end = this.ifHasChildRule(rule.uuid) ? this.startToken.end : Number.MAX_VALUE;
                            this.startToken.parentTokens = this.parentTokens.concat([]);
                            lineObj.highlight.validPairTokens.push(this.startToken);
                            lineObj.ruleUuid = '';
                            // 该节点是否有子节点
                            if (this.ifHasChildRule(rule.uuid)) {
                                this.parentTokens.push(this.startToken);
                                this.startToken = null;
                                continue;
                            }
                        }
                    }
                }
                if (!pairTokens.length && !endToken) {
                    break;
                }
                endToken = endToken || pairTokens.shift();
                if (this.parentTokens.length) {
                    let parentToken = this.parentTokens.peek();
                    // 父节点的优先级要大于子节点，且endtoken能和父节点匹配，当前的开始节点结束匹配
                    if (parentToken.level > this.startToken.level &&
                        this.ifPair(parentToken, endToken, parentToken.line, this.nowPairLine)) {
                        if (this.startToken.line == this.nowPairLine) {
                            this.startToken._end = endToken.start;
                        }
                        this.startToken = this.parentTokens.pop();
                    }
                }
                if (this.ifPair(this.startToken, endToken, this.startToken.line, this.nowPairLine)) {
                    let rule = this.ruleUuidMap[endToken.uuid];
                    originToken = endToken;
                    endToken = Object.assign({}, endToken);
                    endToken.originToken = originToken;
                    endToken.line = this.nowPairLine;
                    endToken._start = this.ifHasChildRule(rule.uuid) ? endToken.start : 0;
                    endToken._end = endToken.end;
                    endToken.startToken = this.startToken;
                    endToken.parentTokens = this.startToken.parentTokens;
                    lineObj.ruleUuid = '';
                    lineObj.highlight.validPairTokens.push(endToken);
                    // 开始和结束节点在同一行
                    if (this.startToken.line == this.nowPairLine && !this.ifHasChildRule(rule.uuid)) {
                        this.startToken._end = endToken._end;
                        endToken._start = this.startToken._start;
                    }
                    this.startToken.endToken = endToken;
                    // 渲染开始行
                    this.htmls[this.startToken.line - 1].highlight.rendered = false;
                    // 渲染结束行
                    this.startToken.line != endToken.line && (this.htmls[endToken.line - 1].highlight.rendered = false);
                    this.startToken = null;
                    this.preEndToken = endToken;
                }
            }
            this.nowPairLine++;
            count++;
        }
        if (this.main) {
            if (this.nowPairLine > length) {
                this.main.startToEndToken = this.startToken;
            } else {
                this.main.startToEndToken = null;
            }
        } else {
            if (this.nowPairLine > length) {
                this.startToEndToken = this.startToken;
            } else {
                this.startToEndToken = null;
                clearTimeout(this.highlightPairToken.timer);
                this.highlightPairToken.timer = setTimeout(() => {
                    this.highlightPairToken();
                }, 0);
            }
        }
        // 更新渲染区域
        this.notify();
    }

    // 开始节点和结束节点是否匹配
    Highlight.prototype.ifPair = function (startToken, endToken, startLine, endLine) {
        if (
            endToken.uuid == startToken.uuid &&
            endToken.type + startToken.type === 0 &&
            // 排除/*/这种情况
            !(startLine == endLine && endToken.start < startToken.end)
        ) {
            return true;
        }
    }

    // 是否含有子规则
    Highlight.prototype.ifHasChildRule = function (ruleUuid) {
        let rule = this.ruleUuidMap[ruleUuid];
        if (rule.childRule && rule.childRule.rules && rule.childRule.rules.length) {
            return true;
        }
        return false;
    }

    // 获取下一个开始节点
    Highlight.prototype.getNextStartToken = function (excludeTokens, pairTokens) {
        while (pairTokens.length) {
            let pass = true;
            let pairToken = pairTokens.shift();
            let rule = this.ruleUuidMap[pairToken.uuid];
            let endRule = this.preEndToken && this.ruleUuidMap[this.preEndToken.uuid];
            // 多行匹配后面紧跟的字节点<script type="text/javascript">子节点</script>
            if (this.preEndToken && endRule.name && this.startNameMap[endRule.name]) {
                rule = this.startNameMap[endRule.name];
                return {
                    uuid: rule.uuid,
                    value: '',
                    level: rule.level,
                    line: this.nowPairLine,
                    start: this.preEndToken.end,
                    end: this.preEndToken.end,
                    type: ENUM.PAIR_START
                };
            } else if (this.parentTokens.length) {
                let parentToken = this.parentTokens.peek();
                // 父节点匹配到结束节点，当前子节点结束匹配
                if (this.ifPair(parentToken, pairToken, parentToken.line, this.nowPairLine)) {
                    return pairToken;
                }
                if (this.ruleUuidMap[pairToken.uuid].parentUuid != parentToken.uuid ||
                    parentToken.line == this.nowPairLine && parentToken.end > pairToken.start) {
                    continue;
                }
            } else if (rule.parentUuid) { // 属于子节点
                continue;
            }
            if (pairToken.type == ENUM.PAIR_END) {
                continue;
            }
            // 需要防止/*test*/*这种情况
            if (
                this.preEndToken &&
                this.preEndToken.line == this.nowPairLine &&
                this.preEndToken.end > pairToken.start
            ) {
                continue;
            }
            let nowExcludeTokens = [];
            if (this.parentTokens.length) {
                nowExcludeTokens = excludeTokens[this.parentTokens.peek().uuid] || [];
            } else {
                nowExcludeTokens = excludeTokens[ENUM.DEFAULT];
            }
            if (this.preEndToken && this.preEndToken.line == this.nowPairLine) {
                nowExcludeTokens = nowExcludeTokens.filter((item) => {
                    return item.start >= this.preEndToken.end;
                });
            }
            // 是否与单行匹配冲突
            for (let i = 0; i < nowExcludeTokens.length; i++) {
                let token = nowExcludeTokens[i];
                if (token.start < pairToken.start && token.end > pairToken.start) {
                    pass = false;
                    break;
                }
            }
            if (pass) {
                return pairToken;
            }
        }
    }

    // 寻找前面最接近的已处理过的开始行
    Highlight.prototype.getStartPairLine = function () {
        if (this.nowPairLine > 1) {
            for (let i = this.nowPairLine - 1; i >= 1; i--) {
                let highlight = this.htmls[i - 1].highlight;
                // 子线程数据还未传递到主线程，此时主线程调用失败
                if (!highlight.validPairTokens) {
                    return this.htmls.length;
                }
                if (highlight.validPairTokens.length) {
                    let pairToken = highlight.validPairTokens[highlight.validPairTokens.length - 1];
                    let rule = this.ruleUuidMap[pairToken.uuid];
                    this.parentTokens = (pairToken.parentTokens || []).concat([]);
                    if (!pairToken.startToken && pairToken.type != ENUM.PAIR_END) {
                        this.startToken = pairToken;
                        this.startToken.endToken = null;
                        // 该节点是否有子节点
                        if (this.ifHasChildRule(this.startToken.uuid)) {
                            this.parentTokens.push(this.startToken);
                            this.startToken = null;
                        }
                    } else {
                        // 结束节点是另一个子节点的开端
                        if (rule.name && this.startNameMap[rule.name]) {
                            rule = this.startNameMap[rule.name];
                            this.parentTokens.push({
                                uuid: rule.uuid,
                                value: '',
                                level: rule.level,
                                line: pairToken.line,
                                start: pairToken.end,
                                end: pairToken.end,
                                type: ENUM.PAIR_START
                            });
                        }
                    }
                    this.nowPairLine = i + 1;
                    break;
                }
            }
        }
        return this.nowPairLine;
    }

    return new Highlight();
}