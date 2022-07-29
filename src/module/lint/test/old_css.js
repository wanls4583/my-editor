/*
 * @Author: lisong
 * @Date: 2022-02-08 10:31:22
 * @Description: 
 */
export default function () {
    Array.prototype.peek = function (index) {
        if (this.length) {
            return this[this.length - (index || 1)];
        }
    }
    Array.prototype._isArray = true;
    String.prototype.peek = function (index) {
        if (this.length) {
            return this[this.length - (index || 1)];
        }
    }
    const brackets = ['{', '}', '[', ']', '(', ')'];
    const regs = {
        space: /^\s+/,
        tag: /^@?[a-zA-Z_\-][a-zA-Z0-9_\-]*/,
        propertyName: /^[\*]?[a-zA-Z_$][a-zA-Z0-9_\-$]*/,
        numValue: /^(?:\d+(?:\.\d*)?|\.\d+)(?:[sS%]|px|PX)?/,
        propertyValue: /^[+\-]?[a-zA-Z0-9_\-$%]+|^#[a-zA-Z0-9]+/,
        punctuator: /^[\+\-\*\~\,\:\;\.\#\=\!]/,
        comment: /\*\//,
        string1: /\\*'/,
        string2: /\\*"/,
        other: /^[\s\S]/
    }
    const maxErrors = 100;

    function TokenType(type, label) {
        this.type = type;
        this.label = label;
        this._isTokenType = true;
    }

    TokenType.prototype.toString = function () {
        return this.label;
    }

    TokenType.STRING = new TokenType(2, 'string');
    TokenType.SELECTOR = new TokenType(3, 'selector');
    TokenType.PROPERTY = new TokenType(4, 'property');
    TokenType.VALUE = new TokenType(5, 'value');
    TokenType.NUM_VALUE = new TokenType(6, 'numValue');
    TokenType.BRACKET = new TokenType(7, 'bracket');
    TokenType.PUNCTUATOR = new TokenType(8, 'punctuator');
    TokenType.OTHER = new TokenType(10, 'other');

    function ErrorType(type) {
        this.type = type;
    }

    ErrorType.UNEXPECTED = new ErrorType(1);
    ErrorType.EXPECTED = new ErrorType(2);
    ErrorType.MISS = new ErrorType(3);
    ErrorType.UNMATCH = new ErrorType(4);

    function Error(token, type, param) {
        token = token || {};
        this.type = type;
        this.param = param;
        this.line = token.line;
        this.column = token.column;
        this.value = token.value;
        this.error = this.toString();
    }

    Error.prototype.toString = function () {
        let error = '';
        let param = this.param instanceof Array ? this.param : [this.param];
        param = `${param.length === 1 ? 'a ' : ''}'${param.join(`'、'`)}'`;
        switch (this.type) {
            case ErrorType.UNEXPECTED:
                error = `unexpected '${this.value}'`;
                break;
            case ErrorType.EXPECTED:
                error = `expected ${param}`;
                if (this.value) {
                    error += ` and instead saw '${this.value}'`;
                }
                break;
            case ErrorType.MISS:
                error = `missing ${param}`;
                if (this.value) {
                    error += ` before '${this.value}'`
                }
                break;
            case ErrorType.UNMATCH:
                error = `unmatched '${this.value}'`
                break;
        }
        return error;
    }

    Error.push = function (error) {
        Error.errors.push(error);
    }

    Error.expected = function (token, value) {
        Error.push(new Error(token, ErrorType.EXPECTED, value));
    }

    Error.unexpected = function (token) {
        Error.push(new Error(token, ErrorType.UNEXPECTED));
    }

    Error.unmatch = function (token) {
        Error.push(new Error(token, ErrorType.UNMATCH));
    }

    // 词法分析器
    function Lexer() {
        this.init();
    }

    Lexer.prototype.init = function () {
        Error.errors = [];
        this.lines = [''];
        this.line = 1;
        this.column = 0;
        this.input = '';
        this.bracketsMap = new Map();
        brackets.forEach((item) => {
            this.bracketsMap.set(item, true);
        });
    }

    Lexer.prototype.reset = function (option) {
        this.lines = option.texts;
        this.line = option.line || 1;
        this.column = option.column || 0
        this.input = this.lines[this.line - 1].slice(this.column);
    }

    Lexer.prototype.skip = function (length) {
        this.input = length ? this.input.slice(length) : this.input;
        this.column += length;
    }

    Lexer.prototype.skipLine = function (length) {
        this.line += length;
        this.column = 0;
        this.input = this.lines[this.line - 1] || '';
    }

    Lexer.prototype.hasNext = function () {
        if (Error.errors.length > maxErrors) {
            return false;
        }
        return this.line < this.lines.length ||
            this.line == this.lines.length && this.lines.peek().length > this.column
    }

    Lexer.prototype.isBracket = function (value) {
        return this.bracketsMap.has(value);
    }

    Lexer.prototype.isTokenType = function (type) {
        return type._isTokenType;
    }

    Lexer.prototype.isProp = function (token) {
        return token.type === TokenType.SELECTOR ||
            token.type === TokenType.PROPERTY
    }

    Lexer.prototype.isValue = function (token) {
        return token.type === TokenType.VALUE ||
            token.type === TokenType.NUM_VALUE ||
            token.type === TokenType.SELECTOR ||
            token.type === TokenType.PROPERTY ||
            token.type === TokenType.STRING
    }

    Lexer.prototype.craeteToken = function (value, type) {
        let line = this.line;
        let column = this.column;
        if (line > this.lines.length) {
            line = this.lines.length;
            column = this.lines.peek().length;
        }
        return {
            type: type,
            line: line,
            column: column,
            value: value
        }
    }

    Lexer.prototype.scanSpace = function () {
        let exec = null;
        while (!this.input.length && this.line < this.lines.length) { //去掉空行
            this.skipLine(1);
        }
        exec = regs.space.exec(this.input);
        if (exec) {
            this.skip(exec.index + exec[0].length);
            exec.index >= this.input.length - 1 && this.scanSpace();
        }
    }

    Lexer.prototype.scanComment = function () {
        let exec = null;
        let ch1 = null;
        let ch2 = null;
        let startToken = null;
        this.scanSpace(); //去掉空格
        ch1 = this.input[0];
        ch2 = this.input[1];
        if (ch1 === '/' && ch2 === '*') {
            startToken = this.craeteToken('/*');
            this.skip(2);
            while (this.hasNext() && !(exec = regs.comment.exec(this.input))) {
                this.skipLine(1);
            }
            if (exec) {
                this.skip(exec.index + exec[0].length);
            } else {
                Error.unmatch(startToken);
            }
        }
    }

    Lexer.prototype.scanString = function () {
        let that = this;
        let exec = null;
        let token = null;
        let startToken = null;
        if (this.input[0] === '\'') {
            startToken = this.craeteToken('\'', TokenType.STRING);
            this.skip(1);
            exec = _end(regs.string1);
            token = this.craeteToken('\'', TokenType.STRING);
            if (!exec) {
                Error.unmatch(startToken);
                this.skipLine(1);
            }
            return token;
        } else if (this.input[0] === '"') {
            startToken = this.craeteToken('"', TokenType.STRING);
            this.skip(1);
            exec = _end(regs.string2);
            token = this.craeteToken('"', TokenType.STRING);
            if (!exec) {
                Error.unmatch(startToken);
                this.skipLine(1);
            }
            return token;
        }
        return token;

        function _end(reg) {
            if (!that.hasNext()) {
                return false;
            }
            if (exec = reg.exec(that.input)) {
                that.skip(exec.index + exec[0].length);
                if (exec[0].length % 2 === 0) { //含有奇数个\:\\\'
                    return _end(reg);
                }
                return true;
            } else {
                that.skipLine(1);
                return _end(reg);
            }
        }
    }

    Lexer.prototype.scanIdentifier = function () {
        let exec = null;
        let token = null;
        if (exec = regs.tag.exec(this.input)) {
            token = this.craeteToken(exec[0], TokenType.SELECTOR);
            this.skip(exec.index + exec[0].length);
        } else if (exec = regs.propertyName.exec(this.input)) {
            token = this.craeteToken(exec[0], TokenType.PROPERTY);
            this.skip(exec.index + exec[0].length);
        } else if (exec = regs.numValue.exec(this.input)) {
            token = this.craeteToken(exec[0], TokenType.NUM_VALUE);
            this.skip(exec.index + exec[0].length);
        } else if (exec = regs.propertyValue.exec(this.input)) {
            token = this.craeteToken(exec[0], TokenType.VALUE);
            this.skip(exec.index + exec[0].length);
        }
        return token;
    }

    Lexer.prototype.scanBracket = function () {
        let token = null;
        let ch = this.input[0];
        if (this.isBracket(ch)) {
            token = this.craeteToken(ch, TokenType.BRACKET);
            this.skip(1);
        }
        return token;
    }

    // 操作符号
    Lexer.prototype.scanPunctuator = function () {
        let token = null;
        if (exec = regs.punctuator.exec(this.input)) {
            token = this.craeteToken(exec[0], TokenType.PUNCTUATOR);
            this.skip(exec.index + exec[0].length);
        }
        return token;
    }

    Lexer.prototype.scanOther = function () {
        let exec = null;
        let token = null;
        if (exec = regs.other.exec(this.input)) {
            token = this.craeteToken(exec[0], TokenType.OTHER);
            this.skip(exec.index + exec[0].length);
        }
        return token
    }

    Lexer.prototype.next = function () {
        let token = null;
        this.scanComment();
        if (this.hasNext()) {
            token =
                this.scanIdentifier() ||
                this.scanBracket() ||
                this.scanString() ||
                this.scanPunctuator()
            if (!token) { //存在非法字符
                token = this.scanOther();
                token && Error.unexpected(token);
                return this.next();
            }
        }
        this.preToken = token;
        return token;
    }

    // 语法分析器
    function Parser(lexer) {
        this.lexer = lexer;
        this.cacheList = [];
        this.backs = [];
        this.parseList = [];
        this.preToken = null;
        Error.errors = [];
    }

    Parser.prototype.reset = function (text) {
        this.backs = [];
        this.parseList = [];
        this.preToken = null;
        this.recovery(text);
        Error.errors = [];
    }

    // 添加缓存
    Parser.prototype.cache = function () {
        if (this.cacheList.length && this.cacheList.peek().line == this.lexer.line) {
            this.cacheList.pop();
        }
        this.preToken && this.cacheList.push({
            line: this.preToken.line,
            column: this.preToken.column,
            parseList: this.parseList.slice(0)
        });
    }

    // 从缓存中恢复
    Parser.prototype.recovery = function (text) {
        let index = 0;
        let texts = text.split(/\r*\n/) || [''];
        let hasCache = false;
        while (index < texts.length && index < this.lexer.lines.length && texts[index] === this.lexer.lines[index]) {
            index++;
        }
        if (index > 0) {
            let cacheIndex = -1;
            for (let i = 0; i < this.cacheList.length; i++) {
                if (this.cacheList[i].line <= index) {
                    cacheIndex = i;
                } else {
                    break;
                }
            }
            if (cacheIndex > -1) {
                let cache = this.cacheList[cacheIndex];
                this.parseList = cache.parseList;
                this.cacheList = this.cacheList.slice(0, cacheIndex + 1);
                this.lexer.reset({
                    texts: texts,
                    line: cache.line,
                    column: cache.column
                });
                this.next();
                hasCache = true;
            }
        }
        if (!hasCache) {
            this.cacheList = [];
            this.lexer.reset({
                texts: texts
            });
        }
    }

    Parser.prototype.match = function (token, value) {
        let pass = false;
        for (let i = 0; i < value.length; i++) {
            if (this.lexer.isTokenType(value[i])) {
                if (value[i] === token.type) {
                    pass = true;
                    break;
                }
            } else if (value[i] === token.value) {
                pass = true;
                break;
            }
        };
        return pass;
    }

    Parser.prototype.next = function (length) {
        let token = null;
        length = length || 1;
        while (length > 0) {
            if (this.backs.length) {
                token = this.backs.shift();
            } else {
                token = this.lexer.next();
            }
            this.pre2Token = this.preToken;
            this.preToken = token || this.preToken;
            length--;
        }
        this.puted = false;
        return token;
    }

    Parser.prototype.nextMatch = function (value) {
        let token = this.next() || {};
        let pass = false;
        value = value._isArray ? value : [value];
        pass = token.value && this.match(token, value);
        if (!pass) {
            if (token.value && this.match(this.peek(), value)) {
                Error.unexpected(token);
            } else {
                Error.expected(token, value);
            }
        }
        return pass;
    }

    Parser.prototype.peek = function (length) {
        let token = null;
        length = length || 1;
        if (this.backs.length) {
            token = this.backs[length - 1];
        }
        if (!token) {
            length -= this.backs.length;
            while (length > 0) {
                length--;
                token = this.lexer.next();
                token && this.backs.push(token);
            }
        }
        return token || {};
    }

    Parser.prototype.peekMatch = function (value) {
        let token = this.peek() || {};
        let pass = false;
        value = value._isArray ? value : [value];
        pass = token.value && this.match(token, value);
        if (pass) {
            this.next();
        } else {
            if (token.value && this.match(this.peek(), value)) {
                Error.unexpected(token);
            } else {
                Error.expected(token, value);
            }
        }
        return pass;
    }

    Parser.prototype.hasNext = function () {
        let lookahead = this.peek();
        return lookahead.value
    }

    Parser.prototype.putBack = function () {
        if (this.preToken && !this.puted) {
            this.backs.unshift(this.preToken);
            this.preToken = this.pre2Token;
            this.puted = true;
        }
    }

    Parser.prototype.skipSemicolon = function (length) {
        length = length || Infinity
        while (this.peek().value === ';' && length > 0) {
            this.next();
            length--;
        }
    }

    Parser.prototype.parse = function () {
        let count = 0;
        let startTime = Date.now();
        while (this.hasNext()) {
            this.parseStmt();
            !Error.errors.length && this.cache();
            if (++count % 10 === 0 && Date.now() - startTime > 200) {
                this.parseTimer = setTimeout(() => {
                    this.parseStmt();
                }, 10);
                break;
            }
        }
    }

    Parser.prototype.parseStmt = function () {
        let token = this.peek();
        if (token.value === '@import') {
            this.parseImport();
            return;
        }
        if (token.value === '@charset') {
            this.parseCharset();
            return;
        }
        if (token.value === '@keyframes' || token.value === '@-webkit-keyframes') {
            this.parseKeyFrames();
            return;
        }
        if (token.value === '@media') {
            this.parseMedia();
            return;
        }
        this.parseSelector();
        if (this.peek().value === '{') {
            this.parseBlock();
        }
    }

    Parser.prototype.parseImport = function () {
        this.nextMatch('@import');
        this.nextMatch(TokenType.STRING);
        if (['all', 'print', 'screen', 'speech'].indexOf(this.peek().value) > -1) {
            this.parseMedia(true);
        }
        this.peekMatch(';');
    }

    Parser.prototype.parseCharset = function () {
        this.nextMatch('@charset');
        this.nextMatch(TokenType.STRING);
        this.peekMatch(';');
    }

    Parser.prototype.parseMedia = function (onlyValue) {
        let token = null;
        !onlyValue && this.nextMatch('@media');
        token = this.peek();
        if (token.value === 'not' || token.value === 'only') {
            this.next();
        }
        this.nextMatch(['all', 'print', 'screen', 'speech']);
        while (this.hasNext()) {
            token = this.peek();
            if (token.value === 'and' || token.value === 'or') {
                this.next();
                this.nextMatch('(');
                token = this.next() || {};
                if (!this.lexer.isProp(token)) {
                    Error.expected(token, TokenType.PROPERTY);
                }
                if (this.peek().value != ')') {
                    this.peekMatch(':')
                    token = this.next() || {};
                    if (!this.lexer.isValue(token)) {
                        Error.expected(token, TokenType.VALUE);
                    }
                    this.peekMatch(')');
                }
            } else {
                break;
            }
        }
        if (!onlyValue) {
            this.peekMatch('{');
            this.parseStmt();
            this.peekMatch('}');
        }
    }

    Parser.prototype.parseKeyFrames = function () {
        let token = null;
        this.nextMatch(['@keyframes', '@-webkit-keyframes']);
        token = this.next();
        if (token.type !== TokenType.SELECTOR) {
            Error.expected(token, 'name');
        }
        this.peekMatch('{');
        while (this.hasNext()) {
            if (this.peek().value === '}') {
                break;
            }
            this.nextMatch(TokenType.NUM_VALUE);
            this.parseBlock();
        }
        this.peekMatch('}');
    }

    Parser.prototype.parseSelector = function () {
        let token = this.next() || {};
        if (token.value === '.' || token.value === '#') { //类、ID选择器
            this.nextMatch(TokenType.SELECTOR);
        } else if (token.value === '[') { //属性选择器
            this.nextMatch(TokenType.SELECTOR);
            if (this.peek().value !== ']') {
                this.nextMatch('=');
                token = this.peek();
                if (!this.lexer.isValue(token)) {
                    Error.expected(token, 'value');
                } else {
                    this.next();
                }
                this.peekMatch(']');
            } else {
                this.next();
            }
        } else if (token.value === ':') { //伪类选择器
            if (this.peek().value === ':') {
                this.next();
            }
            this.nextMatch(TokenType.SELECTOR);
            if (this.peek().value === '(') { //:not(p)
                this.next();
                this.parseSelector();
                this.peekMatch(')');
            }
        } else if (token.value !== '*') { //标签选择器
            this.putBack();
            this.nextMatch(TokenType.SELECTOR);
        }
        if (this.hasNext() && this.peek().value !== '{') {
            token = this.peek();
            if (token.value === '+' || token.value === '~') { //兄弟选择器
                this.next();
            } else if (token.value === ',') { //并列选择器
                this.next();
            }
            this.parseSelector();
        }
    }

    Parser.prototype.parseBlock = function () {
        let that = this;
        this.nextMatch('{');
        while (this.hasNext()) {
            if (this.peek().value === '}') {
                break;
            }
            _nextMatchProperty();
            this.peekMatch(':');
            _nextMatchValue();
            if (this.peek().value !== '}') {
                this.peekMatch(';');
            }
        }
        this.peekMatch('}');

        function _nextMatchProperty() {
            let token = that.next();
            if (token.type !== TokenType.SELECTOR && token.type !== TokenType.PROPERTY) {
                Error.expected(TokenType.PROPERTY);
            }
        }

        function _nextMatchValue() {
            let hasValue = false;
            while (that.hasNext()) {
                let token = that.peek();
                if (token.value === ';' || token.value === '}' || token.value === ')') {
                    break;
                }
                token = that.next();
                if (that.lexer.isValue(token)) {
                    hasValue = true;
                } else if (token.value === '(') {
                    let lbraces = 1;
                    while (that.hasNext() && lbraces) {
                        let token = that.next() || {};
                        if (token.value === ')') {
                            lbraces--;
                        } else if (token.value === '(') {
                            lbraces++;
                        }
                    }
                    lbraces && that.peekMatch(')');
                } else if (hasValue && token.value === ',') {
                    _nextMatchValue();
                    break;
                } else if (hasValue && token.value === '!') {
                    that.peekMatch('important');
                    break;
                } else {
                    Error.expected(token, TokenType.VALUE);
                }
            }
            if (!hasValue) {
                Error.expected(null, TokenType.VALUE);
            }
            return hasValue;
        }
    }

    let lexer = new Lexer();
    let parser = new Parser(lexer);
    lexer.parser = parser;

    return {
        parse: function (text) {
            let result = null;
            clearTimeout(parser.parseTimer);
            parser.reset(text);
            parser.parse();
            result = Error.errors.map((item) => {
                let line = item.line;
                let column = item.column;
                if (!item.line || item.line > lexer.lines.length) {
                    line = lexer.lines.length;
                    column = lexer.lines.peek().length;
                }
                return {
                    line: line,
                    column: column,
                    error: item.error
                }
            }).sort((a, b) => {
                if (a.line === b.line) {
                    return a.column - b.column;
                }
                return a.line - b.line;
            });
            // console.log(result);
            return result;
        }
    }
}