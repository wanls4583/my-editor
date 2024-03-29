/*
 * @Author: lisong
 * @Date: 2022-01-07 10:07:14
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
    var keywords = [
        "if", "in", "do", "var", "for", "new",
        "try", "let", "this", "else", "case",
        "void", "with", "enum", "while", "break",
        "catch", "throw", "const", "yield", "class",
        "super", "return", "typeof", "delete",
        "switch", "export", "import", "default",
        "finally", "extends", "function", "continue",
        "debugger", "instanceof", "async", "await"
    ];
    var assignOperator = ['=', '>>>=', '>>=', '<<=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='];
    var binaryOperator = [
        '+', '-', '*', '/', '%', '&', '|', '^', '&&', '||', '===', '==', '!=', '!==',
        '>', '>=', '<', '<=', '>>', '>>>', '<<', 'instanceof', 'in'
    ];
    var unitOperator = ['+', '-', '~', '!', 'typeof', 'delete', 'void'];
    var brackets = ['{', '}', '[', ']', '(', ')'];
    var regs = {
        space: /^\s+/,
        number: /^(?:\d+(?:\.\d*)?|\.\d+?|0x[a-z0-9]+?)(?:e[\+\-]?\d+(?:\.\d*)?)?\b/i,
        identifier: /^[a-zA-Z_$][a-zA-Z0-9_$]*/,
        comment: /\*\//,
        string1: /\\*'/,
        string2: /\\*"/,
        string3: /(\\*`)|(\$\{)/,
        regex: /^\/(?:\\[\s\S]|[^\\])+?\//,
        other: /^[^\s+\-\*\/%&\|\^\=\!\>\<\~\{\}\(\)]+/
    }
    var regflagsMap = {
        'i': true,
        'm': true,
        'g': true,
        'gi': true,
        'gm': true,
        'im': true,
        'gim': true,
    }
    var maxErrors = 100;

    function TokenType(type, label) {
        this.type = type;
        this.label = label;
        this._isTokenType = true;
    }

    TokenType.prototype.toString = function () {
        return this.label;
    }

    TokenType.NUMBER = new TokenType(1, 'number');
    TokenType.BOOLEAN = new TokenType(2, 'boolean');
    TokenType.STRING = new TokenType(3, 'string');
    TokenType.IDENTIFIER = new TokenType(4, 'identifier');
    TokenType.KEYWORD = new TokenType(5, 'keyword');
    TokenType.OPERATOR = new TokenType(6, 'operator');
    TokenType.BRACKET = new TokenType(7, 'bracket');
    TokenType.PUNCTUATOR = new TokenType(8, 'punctuator');
    TokenType.REGEXP = new TokenType(9, 'regexp');
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
        var error = '';
        var param = this.param instanceof Array ? this.param : [this.param];
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

    Error.expectedIdentifier = function (token) {
        Error.push(new Error(token, ErrorType.EXPECTED, TokenType.IDENTIFIER));
    }

    Error.expectedSemicolon = function (token) {
        Error.push(new Error(token, ErrorType.MISS, ';'));
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
        this.assignOperatorMap = {};
        this.unitOperatorMap = {};
        this.binaryOperatorMap = {};
        this.keywordsMap = new Map();
        this.bracketsMap = new Map();
        assignOperator.forEach((item) => {
            this.assignOperatorMap[item] = true;
        });
        unitOperator.forEach((item) => {
            this.unitOperatorMap[item] = true;
        });
        binaryOperator.forEach((item) => {
            this.binaryOperatorMap[item] = true;
        });
        keywords.forEach((item) => {
            this.keywordsMap.set(item, true);
        });
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

    Lexer.prototype.isVariable = function (token) {
        return token.type == TokenType.IDENTIFIER || token.value == 'this';
    }

    Lexer.prototype.isValue = function (token) {
        return this.isScalar(token) || this.isVariable(token);
    }

    Lexer.prototype.isScalar = function (token) {
        return (
            token.type == TokenType.NUMBER ||
            token.type == TokenType.STRING ||
            token.type == TokenType.BOOLEAN ||
            token.type == TokenType.REGEXP
        );
    }

    Lexer.prototype.isDotAble = function (token) {
        return token.type === TokenType.IDENTIFIER || token.type === TokenType.KEYWORD;
    }

    Lexer.prototype.isPostOp = function (token) {
        return token.value === '++' || token.value === '--';
    }

    Lexer.prototype.isPreOp = function (token) {
        return token.value === '++' || token.value === '--';
    }

    Lexer.prototype.isAssignOperator = function (token) {
        return this.assignOperatorMap[token.value];
    }

    Lexer.prototype.isUnitOperator = function (token) {
        return this.unitOperatorMap[token.value];
    }

    Lexer.prototype.isBinaryOperator = function (token) {
        return this.binaryOperatorMap[token.value];
    }

    Lexer.prototype.isKeyWord = function (value) {
        return this.keywordsMap.has(value);
    }

    Lexer.prototype.isBracket = function (value) {
        return this.bracketsMap.has(value);
    }

    Lexer.prototype.isTokenType = function (type) {
        return type._isTokenType;
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
        var exec = null;
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
        var exec = null;
        var ch1 = null;
        var ch2 = null;
        var startToken = null;
        this.scanSpace(); //去掉空格
        ch1 = this.input[0];
        ch2 = this.input[1];
        if (ch1 === '/' && ch2 == '/') {
            this.skipLine(1);
            this.scanComment();
        } else if (ch1 === '/' && ch2 === '*') {
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
        var that = this;
        var exec = null;
        var token = null;
        var startToken = null;
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
        } else if (this.input[0] === '`') {
            startToken = this.craeteToken('`', TokenType.STRING);
            this.skip(1);
            while (this.hasNext()) {
                exec = regs.string3.exec(this.input)
                if (exec && exec[2]) { //模板字符串内的表达式：${test}
                    _parseTmpStr(exec);
                } else if (!exec || exec[0].length % 2 === 0) { //含有基数个\：\\\`
                    this.skipLine(1);
                } else {
                    this.skip(exec.index + exec[0].length);
                    break;
                }
            }
            token = this.craeteToken('`', TokenType.STRING);
            if (!(exec && exec[0].length % 2 === 1)) { //未匹配到结束符
                Error.unmatch(startToken);
            }
        }
        return token;

        function _end(reg) {
            if (exec = reg.exec(that.input)) {
                that.skip(exec.index + exec[0].length);
                if (exec[0].length % 2 === 0) { //含有奇数个\:\\\'
                    return _end(reg);
                }
                return true;
            } else if (that.input.peek() === '\\') {
                that.skipLine(1);
                return _end(reg);
            }
            return false;
        }

        function _parseTmpStr(exec) {
            let preToken = that.parser.preToken;
            let backs = that.parser.backs.slice(0);
            let parseList = that.parser.parseList.slice(0);
            that.skip(exec.index + exec[2].length);
            //清空状态--begin
            that.parser.preToken = null;
            that.parser.backs = [];
            that.parser.parseList = [];
            //清空状态--end
            that.parser.parseExprStmt();
            that.parser.peekMatch('}');
            //恢复状态--begin
            that.parser.preToken = preToken;
            that.parser.backs = backs;
            that.parser.parseList = parseList;
            //恢复状态--end
        }
    }

    Lexer.prototype.scanNunmber = function () {
        var exec = null;
        var token = null;
        if (exec = regs.number.exec(this.input)) {
            token = this.craeteToken(exec[0], TokenType.NUMBER);
            this.skip(exec.index + exec[0].length);
        }
        return token;
    }

    Lexer.prototype.scanIdentifier = function () {
        var exec = null;
        var token = null;
        if (exec = regs.identifier.exec(this.input)) {
            token = this.craeteToken(exec[0], this.isKeyWord(exec[0]) ? TokenType.KEYWORD : TokenType.IDENTIFIER);
            if (token.value === 'true' || token.value === 'false') {
                token.type = TokenType.BOOLEAN;
            }
            if (token.value === 'null') {
                token.type = TokenType.NUMBER;
            }
            this.skip(exec.index + exec[0].length);
        }
        return token;
    }

    Lexer.prototype.scanBracket = function () {
        var token = null;
        var ch = this.input[0];
        if (this.isBracket(ch)) {
            token = this.craeteToken(ch, TokenType.BRACKET);
            this.skip(1);
        }
        return token;
    }

    // 操作符号
    Lexer.prototype.scanOperator = function () {
        var ch1 = this.input[0];
        var ch2 = this.input[1];
        var ch3 = this.input[2];
        var ch4 = this.input[3];
        var token = null;
        if (ch1 == '.' && ch2 === '.' && ch3 === '.') {
            token = this.craeteToken('...', TokenType.OPERATOR);
        } else if (ch1 === ">" && ch2 === ">" && ch3 === ">" && ch4 === "=") {
            token = this.craeteToken('>>>=', TokenType.OPERATOR);
        } else if (ch1 === "=" && ch2 === "=" && ch3 === "=") {
            token = this.craeteToken('===', TokenType.OPERATOR);
        } else if (ch1 === "!" && ch2 === "=" && ch3 === "=") {
            token = this.craeteToken('!==', TokenType.OPERATOR);
        } else if (ch1 === ">" && ch2 === ">" && ch3 === ">") {
            token = this.craeteToken('>>>', TokenType.OPERATOR);
        } else if (ch1 === "<" && ch2 === "<" && ch3 === "=") {
            token = this.craeteToken('<<=', TokenType.OPERATOR);
        } else if (ch1 === ">" && ch2 === ">" && ch3 === "=") {
            token = this.craeteToken('>>=', TokenType.OPERATOR);
        } else if (ch1 === "=" && ch2 === ">") {
            token = this.craeteToken('=>', TokenType.OPERATOR);
        } else if (ch1 === ch2 && ("+-<>&|*".indexOf(ch1) >= 0)) {
            if (ch1 === "*" && ch3 === "=") {
                token = this.craeteToken(ch1 + ch2 + ch3, TokenType.OPERATOR);
            } else {
                token = this.craeteToken(ch1 + ch2, TokenType.OPERATOR);
            }
        } else if ("<>=!+-*%&|^/".indexOf(ch1) >= 0) {
            if (ch2 === "=") {
                token = this.craeteToken(ch1 + ch2, TokenType.OPERATOR);
            } else {
                token = this.craeteToken(ch1, TokenType.OPERATOR);
            }
        } else if ('?:.;,~'.indexOf(ch1) > -1) {
            token = this.craeteToken(ch1, TokenType.OPERATOR);
        }
        token && this.skip(token.value.length);
        return token;
    }

    Lexer.prototype.scanOther = function () {
        var exec = null;
        var token = null;
        if (exec = regs.other.exec(this.input)) {
            token = this.craeteToken(exec[0], TokenType.OTHER);
            this.skip(exec.index + exec[0].length);
        }
        return token
    }

    Lexer.prototype.next = function () {
        let token = null;
        let that = this;
        this.scanComment();
        if (this.hasNext()) {
            token =
                this.scanIdentifier() ||
                this.scanBracket() ||
                this.scanNunmber() ||
                this.scanString() ||
                _scanOp()
            if (!token) { //存在非法变量
                token = this.scanOther();
                token && Error.unexpected(token);
                return this.next();
            }
        }
        this.preToken = token;
        return token;

        function _scanOp() {
            let token = null;
            if (
                that.input[0] === '/' &&
                (
                    !that.preToken ||
                    that.preToken.type === TokenType.OPERATOR ||
                    that.preToken.value === '{' ||
                    that.preToken.value === '[' ||
                    that.preToken.value === '(' ||
                    that.preToken.value === 'return'
                )
            ) {
                let exec = regs.regex.exec(that.input);
                if (exec) {
                    token = that.craeteToken(exec[0], TokenType.REGEXP);
                    that.skip(exec.index + exec[0].length);
                } else {
                    token = that.craeteToken(that.input, TokenType.REGEXP);
                    that.skipLine(1);
                    if (token.value.peek() !== '/') {
                        let _token = Object.assign({}, token);
                        _token.value = '/';
                        Error.unmatch(_token);
                    }
                }
            } else {
                token = that.scanOperator();
            }
            return token;
        }
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
        var index = 0;
        var texts = text.split(/\r*\n/) || [''];
        var hasCache = false;
        while (index < texts.length && index < this.lexer.lines.length && texts[index] === this.lexer.lines[index]) {
            index++;
        }
        if (index > 0) {
            var cacheIndex = -1;
            for (var i = 0; i < this.cacheList.length; i++) {
                if (this.cacheList[i].line <= index) {
                    cacheIndex = i;
                } else {
                    break;
                }
            }
            if (cacheIndex > -1) {
                var cache = this.cacheList[cacheIndex];
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
        var pass = false;
        for (var i = 0; i < value.length; i++) {
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
        var token = null;
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
        var token = this.next() || {};
        var pass = false;
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
        var token = null;
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
        var token = this.peek() || {};
        var pass = false;
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
        var lookahead = this.peek();
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
        var count = 0;
        var startTime = Date.now();
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

    // 代码块
    Parser.prototype.parseStmt = function (skipCheckSemicolon) {
        var lookahead = this.peek();
        if (skipCheckSemicolon) {
            if (lookahead.value === ';') {
                return;
            }
        } else if (this.preToken && this.preToken.line == lookahead.line &&
            this.preToken.value != '{' && this.preToken.value != '}' &&
            lookahead.value != ';') { //两条语句在同一行，且没有分隔符
            Error.expectedSemicolon(lookahead);
        }
        this.skipSemicolon();
        lookahead = this.peek();
        if (lookahead.type === TokenType.IDENTIFIER && this.peek(2).value === ':') { //跳转标记
            this.next(2);
            lookahead = this.peek();
        }
        switch (lookahead.value) {
            case 'var':
            case 'let':
            case 'const':
                this.parseDeclareStmt();
                break;
            case '{':
                if (this.peek(3).value === ':') {
                    this.parseObjectStmt();
                } else {
                    this.parseBlockStmt();
                }
                break;
            case 'import':
                this.parseImportStmt();
                break;
            case 'export':
                this.parseExportStmt();
                break;
            case 'if':
                this.parseIfStmt();
                break;
            case 'switch':
                this.parseSwitchStmt();
                break;
            case 'with':
                this.parseWithStmt();
                break;
            case 'while':
                this.parseWhileStmt();
                break;
            case 'do':
                this.parseDoStmt();
                break;
            case 'try':
                this.parseTryStmt();
                break;
            case 'for':
                this.parseForStmt();
                break;
            case 'class':
                this.parseClassStmt();
                break;
            case 'continue':
            case 'break':
                this.parseControlStmt();
                break;
            case 'return':
                this.parseReturnStmt();
                break;
            case 'throw':
                this.parseThrowStmt();
                break;
            case 'function':
                this.parseFunctionStmt(true);
                break;
            default:
                this.parseExprStmt();
                break;
        }
    }

    // 代码块
    Parser.prototype.parseBlockStmt = function (ends) {
        let start = this.peek();
        this.peekMatch('{');
        while (this.hasNext()) {
            this.skipSemicolon();
            let lookahead = this.peek();
            if (lookahead.value === '}' || ends && ends.indexOf(lookahead.value) > -1) {
                break;
            }
            this.parseStmt(true);
        }
        if (!this.peekMatch('}') && start.value === '{') {
            Error.unmatch(start);
        }
    }

    // 对象字面量
    Parser.prototype.parseObjectStmt = function () {
        var start = this.peek();
        var lookahead = null;
        this.peekMatch('{');
        while (this.hasNext() && this.peek().value != '}') {
            if (this.peek().value === '...') { //对象展开运算符
                this.next();
                if (this.peek().value === '{') { //{...{a:1}}
                    this.parseObjectStmt();
                } else { //{...a}
                    this.nextMatch(TokenType.IDENTIFIER);
                }
            } else {
                if (this.peek().value === '[') { //{[1]:1}
                    this.next();
                    this.parseExpr();
                    this.peekMatch(']');
                } else if (this.peek().type === TokenType.OPERATOR) { //非法属性名
                    Error.unexpected(this.next());
                } else if (!this.hasNext()) {
                    break;
                } else {
                    this.next();
                }
                lookahead = this.peek();
                if (lookahead.value === ':' || this.preToken.value === ']') { //{a:1,[1]:1}
                    this.peekMatch(':');
                    this.parseExpr();
                } else { //{a,b}
                    if (this.preToken.type !== TokenType.IDENTIFIER) {
                        Error.expected(lookahead, ':');
                    }
                    if (lookahead.value === '(') { //{a(){},b}
                        this.parseFunArgsStmt();
                        this.parseBlockStmt();
                    } else if (this.peek(2).value === '(') { //{get a(){}, static b(){}}
                        if (this.preToken.value !== 'get' && this.preToken.value !== 'static') {
                            Error.expected(this.preToken, ['get', 'static']);
                        }
                        this.nextMatch(TokenType.IDENTIFIER);
                        this.parseFunArgsStmt();
                        this.parseBlockStmt();
                    }
                }
            }
            if (this.peek().value != '}') {
                if (!this.peekMatch(',')) {
                    break;
                }
            }
        }
        if (!this.peekMatch('}') && start.value === '{') {
            Error.unmatch(start);
        }
    }

    // 声明语句
    Parser.prototype.parseDeclareStmt = function () {
        let that = this;
        this.nextMatch(['var', 'let', 'const']);
        _identifier()
        if (this.peek().value === '=') {
            _assign();
        }
        while (this.hasNext() && this.peek().value === ',') {
            this.next();
            _identifier();
            if (this.peek().value === '=') {
                _assign();
            }
        }

        function _assign() {
            that.next();
            that.parseExpr();
        }

        function _identifier() {
            let lookahead = that.peek();
            if (lookahead.value === '{' || lookahead.value === '[') { //es6:const {a,b} = {a:1,b:2}、const [a,b] = [1,2]
                let startToken = that.next();
                let value = lookahead.value === '{' ? '}' : ']';
                that.nextMatch(TokenType.IDENTIFIER);
                while (that.hasNext() && that.peek().value !== value) {
                    that.peekMatch(',')
                    if (!that.peekMatch(TokenType.IDENTIFIER)) {
                        break;
                    }
                }
                if (!that.peekMatch(value)) {
                    Error.unmatch(startToken);
                }
            } else {
                that.nextMatch(TokenType.IDENTIFIER);
            }
        }
    }

    // 赋值语句
    Parser.prototype.parseAssignStmt = function (value) {
        value = value || '=';
        this.nextMatch(value);
        while (this.hasNext()) {
            if (this.peek(2).value === '=') { //a=1,b=2
                !this.lexer.isVariable(this.next()) && Error.expected(TokenType.IDENTIFIER);
                this.parseAssignStmt('=');
                break;
            } else {
                this.parseExpr();
            }
            if (this.peek().value !== ',') {
                break;
            }
            this.next();
        }
    }

    // import语句
    Parser.prototype.parseImportStmt = function () {
        var lookahead = null;
        this.nextMatch('import');
        lookahead = this.peek();
        if (lookahead.type === TokenType.STRING) { //import 'test.css'
            this.next();
        } else {
            if (lookahead.value === '{') { //import {a,b,c} from 'test'
                this.next();
                this.nextMatch(TokenType.IDENTIFIER);
                while (this.hasNext() && this.peek().value != '}') {
                    this.peekMatch(',')
                    if (!this.peekMatch(TokenType.IDENTIFIER)) {
                        break;
                    }
                    if (this.peek().value === 'as') { //import {a as b} from 'test'
                        this.next();
                        this.nextMatch(TokenType.IDENTIFIER);
                    }
                }
                if (!this.peekMatch('}')) {
                    Error.unmatch(lookahead);
                }
            } else if (lookahead.value === '*') { //import * as a from 'test'
                this.next();
                this.nextMatch('as');
                this.nextMatch(TokenType.IDENTIFIER);
            } else { //import a from 'test'
                this.nextMatch(TokenType.IDENTIFIER);
            }
            this.nextMatch('from');
            this.nextMatch(TokenType.STRING);
        }
    }

    // export语句
    Parser.prototype.parseExportStmt = function () {
        var lookahead = null;
        this.nextMatch('export');
        lookahead = this.peek();
        if (lookahead.value === 'function') { //export function test
            this.next();
            this.parseFunctionStmt();
        } else if (lookahead.value === 'default') { //export default test
            this.next();
            lookahead = this.peek();
            if (lookahead.value == 'function') { //export default function
                this.parseFunctionStmt();
            } else if (lookahead.value === 'class') { //export default class {}
                this.parseClassStmt();
            } else {
                this.parseExprStmt();
            }
        } else if (lookahead.value === '{') { //export {a,b,c} from 'test'
            this.next();
            this.nextMatch(TokenType.IDENTIFIER);
            while (this.hasNext() && this.peek().value != '}') {
                this.peekMatch(',')
                if (!this.peekMatch(TokenType.IDENTIFIER)) {
                    break;
                }
                if (this.peek().value === 'as') { //export {a as b} from 'test'
                    this.next();
                    this.nextMatch(TokenType.IDENTIFIER);
                }
            }
            if (!this.peekMatch('}')) {
                Error.unmatch(lookahead);
            }
            if (this.peek().value === 'from') {
                this.next();
                this.nextMatch(TokenType.STRING);
            }
        } else if (lookahead.value === '*') { //export * as a from 'test'
            this.next();
            if (this.peek().value === 'as') {
                this.nextMatch('as');
                this.nextMatch(TokenType.IDENTIFIER);
            }
            this.nextMatch('from');
            this.nextMatch(TokenType.STRING);
        } else { //export let a=1,b,c
            this.parseDeclareStmt();
        }
    }

    // if语句
    Parser.prototype.parseIfStmt = function () {
        let that = this;
        let lookahead = null;
        this.nextMatch('if');
        this.parseList.push('if');
        _nextExpr();
        if (_stmt() && this.peek().value === ';') {
            lookahead = this.peek(2);
        } else {
            lookahead = this.peek();
        }
        if (lookahead.value === 'else') {
            this.next().value === ';' && this.next();
            if (this.peek().value === 'if') {
                this.parseIfStmt();
            } else {
                _stmt();
            }
        }
        this.parseList.pop();

        function _nextExpr() {
            that.peekMatch('(');
            that.parseExprStmt();
            that.peekMatch(')');
        }

        function _stmt() {
            if (that.peek().value === '{') {
                that.parseBlockStmt(['else']);
            } else {
                that.parseStmt(true);
                return true;
            }
        }
    }

    // switch语句
    Parser.prototype.parseSwitchStmt = function () {
        let start = null;
        let lookahead = null;
        this.parseList.push('switch');
        this.nextMatch('switch');
        this.peekMatch('(');
        this.parseExprStmt();
        this.peekMatch(')');
        start = this.peek();
        this.peekMatch('{');
        while (this.hasNext() && this.peek().value != '}') {
            if (this.peek().value === 'default') {
                this.nextMatch('default');
            } else {
                this.nextMatch('case');
                this.parseExprStmt();
            }
            this.peekMatch(':');
            while (this.hasNext()) {
                this.skipSemicolon();
                lookahead = this.peek();
                if (lookahead.value === '}' ||
                    lookahead.value === 'break' ||
                    lookahead.value === 'case' ||
                    lookahead.value === 'default') {
                    break;
                }
                this.parseStmt(true);
            }
            if (this.peek().value === 'break') {
                let map = {
                    '}': true,
                    'case': true,
                    'default': true,
                }
                this.next();
                this.skipSemicolon();
                lookahead = this.peek();
                if (!map[lookahead.value]) { //break后面只能跟随case
                    Error.expected(lookahead, ['case', 'default']);
                    while (this.hasNext() && !map[this.peek().value]) {
                        this.next();
                    }
                }
            }
        }
        if (!this.peekMatch('}') && start.value === '{') {
            Error.unmatch(start);
        }
        this.parseList.pop();
    }

    // with语句
    Parser.prototype.parseWithStmt = function () {
        this.nextMatch('with');
        this.peekMatch('(');
        this.parseExprStmt();
        this.peekMatch(')');
        this.parseBlockStmt();
    }

    // while语句
    Parser.prototype.parseWhileStmt = function () {
        this.parseList.push('while');
        this.nextMatch('while');
        this.peekMatch('(');
        this.parseExprStmt();
        this.peekMatch(')');
        if (this.peek().value === '{') {
            this.parseBlockStmt();
        } else {
            this.parseStmt(true);
        }
        this.parseList.pop();
    }

    // do while语句
    Parser.prototype.parseDoStmt = function () {
        this.parseList.push('do');
        this.nextMatch('do');
        if (this.peek().value === '{') {
            this.parseBlockStmt();
        } else {
            this.parseStmt(true);
            this.skipSemicolon(1);
        }
        this.nextMatch('while');
        this.peekMatch('(');
        this.parseExprStmt();
        this.peekMatch(')');
        this.parseList.pop();
    }

    // try catch语句
    Parser.prototype.parseTryStmt = function () {
        let lookahead = null;
        this.nextMatch('try');
        this.parseBlockStmt();
        lookahead = this.peek();
        if (lookahead.value !== 'catch' && lookahead.value !== 'finally') {
            Error.expected(lookahead, ['catch', 'finally']);
        } else {
            if (lookahead.value === 'catch') {
                this.nextMatch('catch');
                this.peekMatch('(');
                this.nextMatch(TokenType.IDENTIFIER);
                this.peekMatch(')');
                this.parseBlockStmt();
            }
            if (this.peek().value === 'finally') {
                this.next();
                this.parseBlockStmt();
            }
        }
    }

    // for语句
    Parser.prototype.parseForStmt = function () {
        this.parseList.push('for');
        this.nextMatch('for');
        this.peekMatch('(');
        if (this.peek(2).value === 'in' ||
            this.peek(2).value === 'of' ||
            this.peek(3).value === 'in' ||
            this.peek(3).value === 'of') { //for in、es6 for of 语句
            if (this.peek(3).value === 'in' || this.peek(3).value === 'of') {
                this.nextMatch(['var', 'let', 'const']);
            }
            this.nextMatch(TokenType.IDENTIFIER);
            this.nextMatch(['in', 'of']);
            this.parseExprStmt();
        } else {
            if (['var', 'let', 'const'].indexOf(this.peek().value) > -1) {
                this.parseDeclareStmt();
            } else if (this.peek().value != ';') {
                this.parseExprStmt();
            }
            this.nextMatch(';');
            this.peek().value != ';' && this.parseExprStmt();
            this.nextMatch(';');
            this.peek().value != ')' && this.parseExprStmt();
        }
        this.peekMatch(')');
        if (this.peek().value === '{') {
            this.parseBlockStmt();
        } else {
            this.parseStmt(true);
        }
        this.parseList.pop();
    }

    // 函数声明
    Parser.prototype.parseFunctionStmt = function (needName) {
        this.nextMatch('function');
        if (this.peek().type === TokenType.IDENTIFIER || needName) {
            this.nextMatch(TokenType.IDENTIFIER);
        }
        this.parseFunArgsStmt();
        this.parseBlockStmt();
    }

    // 类声明
    Parser.prototype.parseClassStmt = function () {
        var start = null;
        var needName = !this.preToken || ['(', '=', 'default'].indexOf(this.preToken.value) == -1;
        this.nextMatch('class');
        if (this.peek().type === TokenType.IDENTIFIER || needName) {
            this.nextMatch(TokenType.IDENTIFIER);
        }
        if (this.peek().value === 'extends') {
            this.next();
            this.nextMatch(TokenType.IDENTIFIER);
        }
        start = this.peek();
        this.peekMatch('{');
        while (this.hasNext() && this.peek().value != '}') {
            if (this.peek(2).value === '=') { //属性
                this.nextMatch(TokenType.IDENTIFIER);
                this.parseAssignStmt('=');
            } else { //方法
                if (this.peek().value === 'static' || this.peek().value === 'get') {
                    this.next();
                }
                this.nextMatch(TokenType.IDENTIFIER);
                this.parseFunArgsStmt();
                this.parseBlockStmt();
            }
        }
        if (!this.peekMatch('}') && start.value === '{') {
            Error.unmatch(start);
        }
    }

    // 函数参数
    Parser.prototype.parseFunArgsStmt = function () {
        let that = this;
        this.peekMatch('(');
        if (this.peek().value != ')') {
            this.nextMatch(TokenType.IDENTIFIER);
        }
        if (this.peek().value === '=') { //es6预设值
            _assign();
        }
        while (this.hasNext() && this.peek().value === ',') {
            this.next();
            this.nextMatch(TokenType.IDENTIFIER);
            if (this.peek().value === '=') {
                _assign();
            }
        }
        this.peekMatch(')');

        function _assign() {
            that.next();
            that.parseExpr();
        }
    }

    // break,continue
    Parser.prototype.parseControlStmt = function () {
        var token = this.next();
        if (!this.checkIn(['for', 'while', 'do', 'if'])) {
            Error.unexpected(token);
        } else if (this.peek().type === TokenType.IDENTIFIER) { //continue flag
            this.next();
        }
    }

    // return语句
    Parser.prototype.parseReturnStmt = function () {
        var lookahead = null;
        this.nextMatch('return');
        lookahead = this.peek();
        if (lookahead.value !== ';' && lookahead.value !== '}' && lookahead.line === this.preToken.line) {
            this.parseExprStmt();
        }
    }

    // throw语句
    Parser.prototype.parseThrowStmt = function () {
        var lookahead = null;
        this.nextMatch('throw');
        lookahead = this.peek();
        if (lookahead.line !== this.preToken.line) {
            Error.expected(lookahead, 'expression');
        } else {
            this.parseExprStmt();
        }
    }

    Parser.prototype.checkIn = function (value) {
        value = value instanceof Array ? value : [value];
        for (var i = this.parseList.length; i >= 0; i--) {
            if (value.indexOf(this.parseList[i]) > -1) {
                return true;
            }
        }
        return false;
    }

    // 正则表达式
    Parser.prototype.parseRegex = function () {
        this.next();
        if (this.peek().type === TokenType.IDENTIFIER) {
            let value = this.peek().value.toLowerCase();
            if (regflagsMap[value.split('').sort().join('')]) {
                this.next();
            }
        }
    }

    // 表达式分析
    Parser.prototype.parseExprStmt = function () {
        while (this.hasNext()) {
            this.parseExpr();
            if (this.peek().value == ',') { //下一个表达式
                this.next();
            } else {
                break;
            }
        }
    }

    // 单条表达式分析
    Parser.prototype.parseExpr = function () {
        var originToken = this.peek();
        var lookahead = null;
        if (!this.hasNext()) {
            Error.expected(null, 'expression');
            return;
        }
        while (true) {
            var leftHand = this.parseLeftHand();
            if (leftHand.end) { //前面非标识符
                break;
            }
            lookahead = this.peek();
            if (lookahead.value === '.' && this.preToken.type !== TokenType.NUMBER) { //点运算符
                this.parseDot();
                lookahead = this.peek();
                leftHand.assignAble = true;
            }
            if (lookahead.value === '[' && this.preToken.type !== TokenType.NUMBER) { //属性运算符
                this.parseProperty();
                lookahead = this.peek();
                leftHand.assignAble = true;
            }
            if (this.lexer.isPostOp(lookahead)) { //后置运算符
                !leftHand.assignAble && Error.expectedIdentifier(lookahead);
                leftHand.assignAble = false;
                this.next();
                lookahead = this.peek();
            }
            if (lookahead.value === '?') { //三元运算符
                this.nextMatch('?');
                this.parseExpr();
                this.peekMatch(':');
                continue;
            }
            if (this.lexer.isAssignOperator(lookahead) && leftHand.assignAble) { //赋值运算符
                this.parseAssignStmt(this.peek().value);
                break;
            }
            if (!this.lexer.isBinaryOperator(lookahead)) { //下一个不是二元运算符，表达式结束
                break;
            }
            this.next();
            if (!this.hasNext()) { //表达式未结束
                Error.unexpected(this.preToken);
                break;
            }
        }
    }

    Parser.prototype.parseLeftHand = function () {
        let preToken = this.preToken;
        let token = this.next();
        let lookahead = null;
        let assignAble = false; //是否可赋值
        let end = false; //是否结束当前表达式
        let isPreOp = false;
        let isSignOp = false;
        if (this.lexer.isUnitOperator(token)) { //一元运算符:+1,-1
            if (token.value === '!' || token.value === 'delete' || token.value === 'void') {
                let value = token.value;
                while (token && token.value === value) { //!!!...
                    preToken = token;
                    token = this.next();
                }
            } else {
                preToken = token;
                token = this.next();
            }
            isSignOp = true;
        }
        if (token && this.lexer.isPreOp(token)) { //前置运算符:++a,--a
            preToken = token;
            token = this.next();
            token && !this.lexer.isVariable(token) && Error.expectedIdentifier(token);
            isPreOp = true;
        }
        lookahead = this.peek();
        if (!token) {
            Error.expectedIdentifier();
            end = true;
        } else if (token.value === 'function') { //函数声明
            this.putBack();
            this.parseFunctionStmt();
            if (this.peek().value === '(') { //function(){}()
                this.parseCallArgs();
            }
        } else if (token.value === '(') {
            this.putBack();
            this.parseParen();
            assignAble = true;
        } else if (token.value === '[') { //数组
            this.putBack();
            this.parseArray();
        } else if (token.value === 'new') { //new对象
            this.putBack();
            this.parseNew();
        } else if (token.value == '{') { //对象字面量
            this.putBack();
            this.parseObjectStmt();
        } else if (token.type === TokenType.REGEXP) { //正则表达式
            this.putBack();
            this.parseRegex();
        } else if (lookahead.value === '(' && !isPreOp) { //函数调用test()
            this.parseCallArgs();
        } else if (lookahead.value === '=>' &&
            !isPreOp && !isSignOp && this.lexer.isVariable(token)) { //es6箭头函数test=>{}
            this.parseArrorwFunction(preToken && preToken.value === ':');
            end = true;
        } else if (!isPreOp && !isSignOp && this.lexer.isVariable(token)) { //是否可赋值
            assignAble = true;
        } else if (!this.lexer.isValue(token)) { //非运算对象
            Error.expectedIdentifier(token);
            end = true;
        }
        return {
            assignAble: assignAble,
            end: end
        }
    }

    Parser.prototype.parseParen = function () {
        let lookLength = 1;
        let startToken = this.peek();
        let preToken = this.preToken;
        this.nextMatch('(');
        let lookToken = this.peek();
        while (lookToken.value && lookToken.value != ')') {
            lookLength++;
            lookToken = this.peek(lookLength);
        }
        if (lookToken.value === ')' && this.peek(lookLength + 1).value === '=>') { //es6箭头函数
            this.putBack();
            this.parseFunArgsStmt();
            this.parseArrorwFunction(preToken && preToken.value === ':');
        } else {
            this.parseExprStmt();
            !this.peekMatch(')') && Error.unmatch(startToken);
            if (this.peek().value === '(') { //(a)()
                this.parseCallArgs();
            }
        }
    }

    Parser.prototype.parseArray = function () {
        var lookahead = null;
        this.nextMatch('[');
        while (this.hasNext() && this.peek().value !== ']') {
            if (this.peek().value === '...') { // [...a]
                this.next();
            }
            this.parseExpr();
            lookahead = this.peek();
            if (lookahead.value === ',') {
                this.next();
            } else {
                break;
            }
        }
        this.nextMatch(']');
    }

    Parser.prototype.parseNew = function () {
        this.nextMatch('new');
        if (this.peek().value === '(') {
            this.parseParen();
        } else {
            this.nextMatch([TokenType.IDENTIFIER, TokenType.KEYWORD]);
        }
        if (this.peek().value === '(') {
            this.parseCallArgs();
        }
    }

    Parser.prototype.parseArrorwFunction = function (skipNextExpr) {
        this.nextMatch('=>');
        if (this.peek().value === '{') {
            this.parseBlockStmt();
        } else if (skipNextExpr) { //{a:t=>t()}
            this.parseExpr();
        } else {
            this.parseExprStmt();
        }
    }

    // 函数调用
    Parser.prototype.parseCallArgs = function () {
        this.peekMatch('(');
        if (this.peek().value !== ')') {
            while (this.hasNext()) {
                if (this.peek().value === '...') {
                    this.next();
                    if (this.peek().value === '{') {
                        this.parseObjectStmt();
                    } else {
                        this.nextMatch(TokenType.IDENTIFIER);
                    }
                } else {
                    this.parseExpr();
                }
                if (this.peek().value === ')') {
                    break;
                }
                this.peekMatch(',');
            }
        }
        this.peekMatch(')');
        if (this.peek().value === '(') {
            this.parseCallArgs();
        }
    }

    // 点运算符
    Parser.prototype.parseDot = function () {
        var lookahead = null;
        if (this.preToken.type !== TokenType.NUMBER && this.preToken.type !== TokenType.BOOLEAN) {
            this.nextMatch('.');
            lookahead = this.peek();
            if (this.lexer.isDotAble(lookahead)) {
                this.next();
                lookahead = this.peek();
                if (lookahead.value === '(') { //函数调用test()
                    this.parseCallArgs();
                }
                lookahead = this.peek();
                if (lookahead.value === '[') {
                    this.parseProperty();
                } else if (lookahead.value === '.') {
                    this.parseDot();
                }
            } else {
                Error.expected(lookahead, TokenType.IDENTIFIER);
            }
        } else {
            Error.unexpected(this.next());
        }
    }

    Parser.prototype.parseProperty = function () {
        var lookahead = null;
        this.nextMatch('[');
        this.parseExprStmt();
        this.nextMatch(']');
        lookahead = this.peek();
        if (lookahead.value === '(') { //函数调用test()
            this.parseCallArgs();
        }
        lookahead = this.peek();
        if (lookahead.value === '[') {
            this.parseProperty();
        } else if (lookahead.value === '.') {
            this.parseDot();
        }
    }

    var lexer = new Lexer();
    var parser = new Parser(lexer);
    lexer.parser = parser;

    return {
        parse: function (text) {
            let result = null;
            clearTimeout(parser.parseTimer);
            parser.reset(text);
            parser.parse();
            result = Error.errors.map((item) => {
                var line = item.line;
                var column = item.column;
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