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
        this.ruleNameMap = {};
        this.startNameMap = {};
        this.ruleUuidMap = {};
        this.singleRules = [];
        this.rulesObj.singleRules = [];
        this.rulesObj.pairRules = [];
        this.rulesObj.rules.map((item) => {
            _initRules(item, this.rulesObj.singleRules, this.rulesObj.pairRules);
        });
        this.rulesObj.pairRules.map((rule) => {
            rule.excludeRules = this.rulesObj.singleRules.filter((item) => {
                return item.level >= rule.level && item.token != rule.token;
            });
        });

        function _initRules(item, singleRules, pairRules) {
            that.ruleUuidMap[item.uuid] = item;
            if (typeof item.name == 'string') {
                that.ruleNameMap[item.name] = item;
            }
            if (typeof item.start == 'string') {
                that.startNameMap[item.start] = item;
            }
            if (item.regex && !item.start) {
                that.singleRules.push(item);
                singleRules.push(item);
            } else {
                pairRules.push(item);
            };
            if (item.childRule && item.childRule.rules) {
                singleRules = [];
                pairRules = [];
                item.childRule.singleRules = singleRules;
                item.childRule.pairRules = pairRules;
                item.childRule.rules.map((_item) => {
                    _initRules(_item, singleRules, pairRules);
                });
                pairRules.map((rule) => {
                    rule.excludeRules = singleRules.filter((item) => {
                        return item.level >= rule.level && item.token != rule.token;
                    });
                });
            }
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
    Highlight.prototype.getPairTokens = function (text, pairRules, lastIndex) {
        let pairTokens = [];
        let resultMap = new Map(); //缓存相同的正则
        let result = null;
        pairRules.map((rule) => {
            let tokens = null;
            if (rule.start instanceof RegExp) {
                let excludeTokens = [];
                let type = ENUM.PAIR_START;
                let preExcludeEnd = null;
                tokens = _exec(rule, rule.start, type);
                // 去除无效token--start
                rule.excludeRules.map((rule) => {
                    let tokens = _exec(rule, rule.regex, 'del');
                    excludeTokens = excludeTokens.concat(tokens);
                });
                excludeTokens = excludeTokens.concat(tokens);
                excludeTokens.sort((a, b) => {
                    return a.start - b.start;
                });
                excludeTokens.map((item) => {
                    if (item.type == 'del') {
                        preExcludeEnd = preExcludeEnd ? (item.end > preExcludeEnd ? item.end : preExcludeEnd) : item.end;
                    } else if (preExcludeEnd > item.start) {
                        item.type = 'del';
                    }
                });
                tokens = excludeTokens.filter((item) => {
                    return item.type != 'del';
                });
                // 去除无token--end
                pairTokens = pairTokens.concat(tokens);
            }
            if (rule.next instanceof RegExp) {
                let type = ENUM.PAIR_END;
                tokens = _exec(rule, rule.next, type);
                pairTokens = pairTokens.concat(tokens);
            }
        });
        pairTokens.sort((a, b) => {
            if (a.start == b.start) {
                return b.level - a.level;
            }
            return a.start - b.start;
        });
        return pairTokens;

        function _exec(roleObj, rule, type) {
            let tokens = [];
            let pairToken = null;
            rule.lastIndex = lastIndex || 0;
            if (resultMap.has(rule.source)) {
                let _tokens = resultMap.get(rule.source);
                _tokens.map((pairToken) => {
                    pairToken = _copyToken(pairToken, roleObj, type);
                    tokens.push(pairToken);
                });
            } else {
                while (result = rule.exec(text)) {
                    pairToken = _createToken(roleObj, result, type);
                    tokens.push(pairToken);
                    if (!result[0].length || !rule.global) {
                        break;
                    }
                }
                resultMap.set(rule.source, tokens);
                rule.lastIndex = 0;
            }
            return tokens;
        }

        function _createToken(rule, result, type) {
            return {
                uuid: rule.uuid,
                token: rule.token,
                level: rule.level,
                value: result[0],
                start: result.index,
                end: result.index + result[0].length,
                type: type
            };
        }

        function _copyToken(pairToken, rule, type) {
            pairToken = Object.assign({}, pairToken);
            pairToken.uuid = rule.uuid;
            pairToken.token = rule.token;
            pairToken.level = rule.level;
            pairToken.type = type;
            return pairToken;
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
        let nowLine = this.startLine;
        let endLine = this.startLine + this.maxVisibleLines;
        if (this.main) {
            endLine = endLine > this.htmls.length ? this.htmls.length : endLine;
            while (nowLine <= endLine) {
                let lineObj = this.htmls[nowLine - 1];
                this.main.buildHtml(lineObj);
                nowLine++;
            }
        } else {
            let lineObjs = [];
            nowLine = this.startPairLine;
            endLine = this.endPairLine;
            endLine = endLine > this.htmls.length ? this.htmls.length : endLine;
            while (nowLine <= endLine) {
                let lineObj = this.htmls[nowLine - 1];
                if (!lineObj.highlight.rendered && lineObj.highlight.validPairTokens) {
                    lineObj.highlight.validPairTokens.length && lineObjs.push(lineObj);
                    lineObj.highlight.rendered = true;
                }
                nowLine++;
            }
            lineObjs = lineObjs.map((item) => {
                let validPairTokens = item.highlight.validPairTokens;
                validPairTokens = validPairTokens.map((item) => {
                    item = Object.assign({}, item);
                    delete item.originToken;
                    delete item.parentTokens;
                    delete item.startToken;
                    delete item.endToken;
                    return item;
                });
                return {
                    uuid: item.uuid,
                    parentRuleUuid: item.parentRuleUuid,
                    ruleUuid: item.ruleUuid,
                    highlight: {
                        validPairTokens: validPairTokens
                    }
                }
            });
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
        let that = this;
        let count = 0;
        let length = this.htmls.length;
        this.startPairLine = this.nowPairLine;
        max = max || 5000;
        while (count < max && this.nowPairLine <= length) {
            let lineObj = this.htmls[this.nowPairLine - 1];
            this.pairTokens = [];
            lineObj.highlight.validPairTokens = [];
            lineObj.highlight.rendered = false;
            lineObj.highlight.pairTokens = lineObj.highlight.pairTokens || {};
            // 记录父节点，用于渲染相应的单行tokens
            lineObj.parentRuleUuid = this.parentTokens.length && this.parentTokens.peek().uuid || null;
            // 已有开始节点，则该行可能被其包裹
            lineObj.ruleUuid = this.startToken && this.startToken.uuid || '';
            this.pairTokens = _getPairTokens(lineObj);
            while (this.pairTokens.length) {
                let endToken = null;
                let originToken = null;
                // 获取开始节点
                if (!this.startToken) {
                    this.startToken = this.getNextStartToken();
                    if (this.startToken) {
                        originToken = this.startToken;
                        this.startToken = Object.assign({}, this.startToken);
                        this.startToken.originToken = originToken;
                        if (this.parentTokens.length && this.parentTokens.peek().uuid == this.startToken.uuid) { // 找到的是父节点的结束节点
                            endToken = this.startToken;
                            this.startToken = this.parentTokens.pop();
                            this.pairTokens = _getPairTokens(lineObj, endToken.end);
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
                                this.pairTokens = _getPairTokens(lineObj, this.startToken.end);
                                this.startToken = null;
                                continue;
                            }
                        }
                    }
                }
                if (!this.pairTokens.length && !endToken) {
                    break;
                }
                endToken = endToken || this.pairTokens.shift();
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
                    // 多行匹配后面紧跟的字节点<script type="text/javascript">子节点</script>
                    if (rule && rule.name && this.startNameMap[rule.name]) {
                        rule = this.startNameMap[rule.name];
                        this.parentTokens.push({
                            uuid: rule.uuid,
                            value: '',
                            level: rule.level,
                            line: this.nowPairLine,
                            start: this.preEndToken.end,
                            end: this.preEndToken.end,
                            type: ENUM.PAIR_START
                        });
                    }
                }
            }
            this.nowPairLine++;
            count++;
        }
        this.endPairLine = this.nowPairLine;
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

        function _getPairTokens(lineObj, lastIndex) {
            let parentRule = that.parentTokens.length && that.parentTokens.peek().uuid;
            parentRule = parentRule && that.ruleUuidMap[parentRule];
            if (parentRule) {
                if (!lineObj.highlight.pairTokens[parentRule.uuid]) {
                    lineObj.highlight.pairTokens[parentRule.uuid] = that.getPairTokens(lineObj.text, [parentRule].concat(parentRule.childRule.pairRules), lastIndex);
                }
                that.pairTokens = lineObj.highlight.pairTokens[parentRule.uuid];
            } else {
                if (!lineObj.highlight.pairTokens[ENUM.DEFAULT]) {
                    lineObj.highlight.pairTokens[ENUM.DEFAULT] = that.getPairTokens(lineObj.text, that.rulesObj.pairRules, lastIndex);
                }
                that.pairTokens = lineObj.highlight.pairTokens[ENUM.DEFAULT];
            }
            return that.pairTokens.concat([]);
        }
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
    Highlight.prototype.getNextStartToken = function () {
        while (this.pairTokens.length) {
            let pairToken = this.pairTokens.shift();
            let rule = this.ruleUuidMap[pairToken.uuid];
            if (this.parentTokens.length) {
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
            return pairToken;
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