/*
 * @Author: lisong
 * @Date: 2022-01-07 10:07:14
 * @Description: 
 */
export default function (text) {
    var keywords = [
        "if", "in", "do", "var", "for", "new",
        "try", "let", "this", "else", "case",
        "void", "with", "enum", "while", "break",
        "catch", "throw", "const", "yield", "class",
        "super", "return", "typeof", "delete",
        "switch", "export", "import", "default",
        "finally", "extends", "function", "continue",
        "debugger", "instanceof", "true", "false", "null", "async", "await"
    ];
    var regs = {
        space: /^\s+/,
        number: /^\d+/,
        identifier: /^[a-zA-Z_$][a-zA-Z0-9_$]*/,
        comment: /^\/\//,
        pair_comment: /\*\//,
        string1: /'/,
        string2: /"/,
        string3: /`/,
        stringNext: /\\$/,
        unexpected: /^[^\b]+?\b/
    }
    var TokenType = {
        NUMBER: 1,
        BOOLEAN: 2,
        STRING: 3,
        IDENTIFIER: 4,
        KEYWORD: 5,
        OPERATOR: 6,
        BRACKET: 7,
        PUNCTUATOR: 8
    }
    var ErrorType = {
        UNEXPECTED: 1,
        EXPECTED: 2,
        MISS: 3
    }

    function Error(token, type, param) {
        this.type = type;
        this.param = param;
        this.line = token.line;
        this.column = token.column;
        this.value = token.value;
    }

    Error.expectedIdentifier = function (token) {
        return new Error(token, ErrorType.EXPECTED, ['identifier']);
    }

    Error.unexpected = function (token) {
        return new Error(token, ErrorType.UNEXPECTED);
    }

    // 词法分析器
    function Lexer(text) {
        this.reset(text);
    }

    Lexer.prototype.reset = function (text) {
        this.lines = text && text.split('\n') || [''];
        this.input = this.lines[0];
        this.line = 1;
        this.column = 0
        this.errors = [];
    }

    Lexer.prototype.skip = function (length) {
        this.input = this.input.slice(length);
        this.column += length;
    }

    Lexer.prototype.skipLine = function (length) {
        this.line += length;
        this.column = 0;
        this.input = this.lines[this.line - 1] || '';
    }

    Lexer.prototype.hasNext = function () {
        return this.line < this.lines.length ||
            this.line == this.lines.length && this.lines.peek().length > this.column
    }

    Lexer.prototype.isVariable = function (token) {
        return token.type == TokenType.IDENTIFIER;
    }

    Lexer.prototype.isValue = function (token) {
        return this.isScalar(token) || this.isVariable(token);
    }

    Lexer.prototype.isScalar = function (token) {
        return (
            token.type == TokenType.NUMBER ||
            token.type == TokenType.STRING ||
            token.type == TokenType.BOOLEAN
        );
    }

    Lexer.prototype.scanSpace = function () {
        var exec = regs.space.exec(this.input);
        if (exec) {
            this.skip(exec[0].length);
        }
    }

    Lexer.prototype.scanComment = function () {
        var exec = null;
        this.scanSpace();
        if (exec = regs.comment.exec(this.input)) {
            this.skipLine(1);
            this.scanComment();
        } else if (this.input[0] == '/' && this.input[1] == '*') {
            while (!(exec = regs.pair_comment.exec(this.input))) {
                this.skipLine(1);
            }
        }
    }

    Lexer.prototype.scanString = function () {
        var exec = null;
        var token = null;
        if (this.input[0] == '\'') {
            token = _token(this.line, this.column, '\'');
            this.skip(1);
            _end(regs.string1);
            return token;
        } else if (this.input[0] == '"') {
            token = _token(this.line, this.column, '"');
            this.skip(1);
            _end(regs.string2);
        } else if (this.input[0] == '`') {
            token = _token(this.line, this.column, '`');
            this.skip(1);
            while (!(exec = regs.string3.exec(this.input))) {
                this.skipLine(1);
            }
            exec && this.skip(exec.index + 1);
        }
        return token;

        function _end(reg) {
            if (exec = reg.exec(this.input)) {
                this.skip(exec.index + 1);
                return true;
            } else if (exec = regs.stringNext.exec(this.input)) {
                this.skipLine(1);
                return _end(reg);
            }
            return false;
        }

        function _token(line, column, value) {
            return {
                type: TokenType.STRING,
                line: line,
                column: column,
                value: value
            }
        }
    }

    Lexer.prototype.scanNunmber = function () {
        var exec = null;
        var token = null;
        if (exec = regs.number.exec(this.input)) {
            token = {
                type: TokenType.NUMBER,
                line: this.line,
                column: this.column,
                value: exec[0]
            }
            this.skip(exec[0].length);
        }
        return token;
    }

    Lexer.prototype.scanIdentifier = function () {
        var exec = null;
        var token = null;
        if (exec = regs.identifier.exec(this.input)) {
            token = {
                type: keywords.indexOf(exec[0]) > -1 ? TokenType.KEYWORD : TokenType.IDENTIFIER,
                line: this.line,
                column: this.column,
                value: exec[0]
            }
            this.skip(exec[0].length);
        }
        return token;
    }

    Lexer.prototype.scanBracket = function () {
        var char = this.input[0];
        var bracket = ['{', '}', '[', ']', '(', ')'];
        if (bracket.indexOf(char) > -1) {
            this.skip(1);
            return {
                type: TokenType.BRACKET,
                line: this.line,
                column: this.column,
                value: char
            }
        }
    }

    // 标点符号
    Lexer.prototype.scanPunctuator = function () {
        var ch = this.input[0];
        if (ch == '?' || ch == ':') {
            this.skip(1);
            return {
                type: TokenType.PUNCTUATOR,
                line: this.line,
                column: this.column,
                value: ch
            }
        }
    }

    // 操作符号
    Lexer.prototype.scanOperator = function () {
        var ch1 = this.input[0];
        var ch2 = this.input[1];
        var ch3 = this.input[2];
        var ch4 = this.input[3];
        var token = null;
        if (ch1 === ">" && ch2 === ">" && ch3 === ">" && ch4 === "=") {
            token = {
                type: TokenType.OPERATOR,
                value: ">>>="
            };
        } else if (ch1 === "=" && ch2 === "=" && ch3 === "=") {
            token = {
                type: TokenType.OPERATOR,
                value: "==="
            };
        } else if (ch1 === "!" && ch2 === "=" && ch3 === "=") {
            token = {
                type: TokenType.OPERATOR,
                value: "!=="
            };
        } else if (ch1 === ">" && ch2 === ">" && ch3 === ">") {
            token = {
                type: TokenType.OPERATOR,
                value: ">>>"
            };
        } else if (ch1 === "<" && ch2 === "<" && ch3 === "=") {
            token = {
                type: TokenType.OPERATOR,
                value: "<<="
            };
        } else if (ch1 === ">" && ch2 === ">" && ch3 === "=") {
            token = {
                type: TokenType.OPERATOR,
                value: ">>="
            };
        } else if (ch1 === "=" && ch2 === ">") {
            token = {
                type: TokenType.OPERATOR,
                value: '=>'
            };
        } else if (ch1 === ch2 && ("+-<>&|*".indexOf(ch1) >= 0)) {
            if (ch1 === "*" && ch3 === "=") {
                token = {
                    type: TokenType.OPERATOR,
                    value: ch1 + ch2 + ch3
                };
            }

            token = {
                type: TokenType.OPERATOR,
                value: ch1 + ch2
            };
        } else if ("<>=!+-*%&|^/,".indexOf(ch1) >= 0) {
            if (ch2 === "=" && ch1 != ',') {
                token = {
                    type: TokenType.OPERATOR,
                    value: ch1 + ch2
                };
            }

            token = {
                type: TokenType.OPERATOR,
                value: ch1
            };
        }
        if (token) {
            token.line = this.line;
            token.column = this.column;
            this.skip(token.value.length);
        }
        return token;
    }

    Lexer.prototype.scanUnexpected = function () {
        var exec = null;
        if (exec = regs.unexpected.exec(this.input)) {
            var token = {
                type: ErrorType.UNEXPECTED,
                line: this.line,
                column: this.column,
                value: exec[0]
            }
            this.skip(exec[0].length);
            this.errors.push(new Error(token, ErrorType.UNEXPECTED));
        }
    }

    Lexer.prototype.next = function () {
        var token = null;
        this.scanComment();
        if (this.hasNext()) {
            token = this.scanNunmber() ||
                this.scanIdentifier() ||
                this.scanBracket() ||
                this.scanOperator() ||
                this.scanPunctuator() ||
                this.scanString();
            if (!token) { //存在非法变量
                this.scanUnexpected();
                return this.next();
            }
        }
        return token;
    }

    // 语法分析器
    function Parser(lexer) {
        this.lexer = lexer;
        this.backs = [];
        this.errors = [];
    }

    Parser.prototype.next = function () {
        var token = null;
        if (this.backs.length) {
            token = this.backs.shift();
        } else {
            token = this.lexer.next();
        }
        this.preToken = token || this.preToken;
        return token;
    }

    Parser.prototype.nextMatch = function (value) {
        var token = this.next();
        if (!token || token.value != value) {
            this.errors.push(new Error(token || this.preToken, ErrorType.EXPECTED, [value]));
        }
        return true;
    }

    Parser.prototype.nextMatchType = function (type) {
        var token = this.next();
        if (!token || token.type != type) {
            this.errors.push(new Error(token || this.preToken, ErrorType.EXPECTED, [type]));
        }
        return true;
    }

    Parser.prototype.peek = function (safe) {
        var token = null;
        if (this.backs.length) {
            token = this.backs[0];
        } else {
            token = this.lexer.next();
            token && this.backs.push(token);
        }
        return token || safe && {};
    }

    Parser.prototype.hasNext = function () {
        return this.peek();
    }

    Parser.prototype.pubBack = function () {
        this.preToken && this.backs.push(this.preToken);
    }

    // 代码块
    Parser.prototype.parseStmt = function () {
        if (this.hasNext()) {
            this.parseDeclareStmt() ||
                this.parseAssignStmt() ||
                this.parseFunction() ||
                this.parseIfStmt() ||
                this.parseWithStmt() ||
                this.parseObject() ||
                this.parseBlock() ||
                this.parseExpr();
        }
    }

    // 代码块
    Parser.prototype.parseBlock = function () {
        if (this.peek(true).value == '{') {
            this.next();
            this.parseStmt();
            this.nextMatch('}');
            return true;
        }
    }

    // 对象字面量
    Parser.prototype.parseObject = function () {
        if (this.peek(true).value == '{') {
            return true;
        }
    }

    // 声明语句
    Parser.prototype.parseDeclareStmt = function () {
        if (['var', 'let', 'const'].indexOf(this.peek(true).value) > -1) {
            this.next();
            this.nextMatchType(TokenType.IDENTIFIER);
            this.parseAssignStmt();
            return true;
        }
    }

    // 赋值语句
    Parser.prototype.parseAssignStmt = function () {
        if (this.peek(true).value == '=') {
            this.next();
            this.parseExpr(true);
            return true;
        }
    }

    // if语句
    Parser.prototype.parseIfStmt = function () {
        var that = this;
        if (this.peek(true).value == 'if') {
            this.next();
            _nextExpr();
            _nextBlock();
            if (this.peek(true).value === 'else') {
                this.next();
                if (this.peek(true).value === 'if') {
                    _nextExpr();
                }
                _nextBlock();
            }
            return true;
        }

        function _nextExpr() {
            that.nextMatch('(');
            that.parseExpr(true);
            that.nextMatch(')');
        }

        function _nextBlock() {
            that.nextMatch('{');
            that.parseBlock();
            that.nextMatch('}');
        }
    }

    // with语句
    Parser.prototype.parseWithStmt = function () {
        if (this.peek(true).value == 'with') {
            this.next();
            this.nextMatch('{');
            this.parseBlock();
            this.nextMatch('}');
            return true;
        }
    }

    // 函数声明
    Parser.prototype.parseFunction = function () {
        if (this.peek(true).value == 'function') {
            var needName = !this.preToken || this.preToken.type != TokenType.OPERATOR && this.preToken.value != '(';
            this.next();
            needName && this.nextMatchType(TokenType.IDENTIFIER);
            this.parseFunArgs();
            return true;
        }
    }

    // 函数参数
    Parser.prototype.parseFunArgs = function () {
        this.nextMatch('(');
        while (this.hasNext() && this.peek().value != ')') {
            this.nextMatchType(TokenType.IDENTIFIER);
            this.nextMatch(',');
        }
        this.next();
        this.parseBlock();
    }

    // 表达式分析
    Parser.prototype.parseExpr = function (need) {
        var token = null;
        var lookahead = null;
        if (!this.hasNext()) {
            need && this.errors.push(Error.expectedIdentifier(this.preToken));
            return;
        }
        while (this.hasNext()) {
            token = this.next();
            if (['+', '-'].indexOf(token.value) > -1) {
                token = this.next();
            } else if (['++', '--'].indexOf(token.value) > -1) {
                token = this.next();
                if (!this.lexer.isVariable(this.peek(true))) {
                    this.errors.push(Error.expectedIdentifier(token));
                    break;
                }
            }
            if (token.value === 'function' || token.value === '{') { //函数或者对象字面量
                token.value === 'function' ? this.parseFunction() : this.parseObject();
                continue;
            }
            if (!this.lexer.isValue(token)) {
                this.errors.push(Error.expectedIdentifier(token));
                break;
            }
            lookahead = this.peek(true);
            if (['++', '--'].indexOf(lookahead.value) > -1) {
                this.next();
                lookahead = this.peek(true);
            }
            if (lookahead.type != TokenType.OPERATOR) { //下一个不是运算符，表达式结束
                break;
            }
            token = this.next();
        }
        if (token && token.type === TokenType.OPERATOR) { //表达式未结束
            this.errors.push(Error.expectedIdentifier(token));
        }
    }

    var lexer = new Lexer();
    var parser = new Parser(lexer);
    if (text) {
        lexer.reset(text);
        parser.parseStmt();
        console.log(lexer.errors.concat(parser.errors));
    }
}