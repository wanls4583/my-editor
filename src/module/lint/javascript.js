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
    var assignOperator = ['>>>=', '>>=', '<<=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='];
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
    var maxErrors = 100;

    function TokenType(type, label) {
        this.type = type;
        this.label = label;
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

    function ErrorType(type) {
        this.type = type;
    }

    ErrorType.UNEXPECTED = new ErrorType(1);
    ErrorType.EXPECTED = new ErrorType(2);
    ErrorType.MISS = new ErrorType(3);

    function Error(token, type, param) {
        token = token || {};
        this.type = type;
        this.param = param;
        this.line = token.line;
        this.column = token.column;
        this.value = token.value;
        this.error = this.toString();
    }
    window.Error = Error;

    Error.prototype.toString = function () {
        var error = '';
        var param = this.param instanceof Array ? this.param : [this.param];
        param = param.join('\' \'');
        param = '\'' + param + '\'';
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
        }
        return error;
    }

    Error.expectedIdentifier = function (token) {
        return new Error(token, ErrorType.EXPECTED, TokenType.IDENTIFIER);
    }

    Error.expectedSeparator = function (token) {
        return new Error(token, ErrorType.MISS, ';');
    }

    Error.expected = function (token, value) {
        return new Error(token, ErrorType.EXPECTED, value);
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
        Error.errors = [];
    }

    Lexer.prototype.skip = function (length) {
        this.input = this.input.slice(length);
        if (!this.input.length) {
            this.line++;
            this.column = 0;
            this.input = this.lines[this.line - 1] || '';
        } else {
            this.column += length;
        }
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
            token.value === 'this' ||
            token.value === 'null'
        );
    }

    Lexer.prototype.isAssignOperator = function (token) {
        return assignOperator.indexOf(token.value) > -1;
    }

    Lexer.prototype.scanSpace = function () {
        var exec = regs.space.exec(this.input);
        if (exec) {
            this.skip(exec[0].length);
            return true;
        }
    }

    Lexer.prototype.scanComment = function () {
        var exec = null;
        while (this.scanSpace()) {}
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
        var that = this;
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
            if (exec = reg.exec(that.input)) {
                that.skip(exec.index + 1);
                return true;
            } else if (exec = regs.stringNext.exec(that.input)) {
                that.skipLine(1);
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
        var token = null;
        var char = this.input[0];
        var bracket = ['{', '}', '[', ']', '(', ')'];
        if (bracket.indexOf(char) > -1) {
            token = {
                type: TokenType.BRACKET,
                line: this.line,
                column: this.column,
                value: char
            }
            this.skip(1);
        }
        return token;
    }

    // 标点符号
    Lexer.prototype.scanPunctuator = function () {
        var token = null;
        var ch = this.input[0];
        var punctuator = ['?', ':', ',', ';', '.']
        if (punctuator.indexOf(ch) > -1) {
            token = {
                type: TokenType.PUNCTUATOR,
                line: this.line,
                column: this.column,
                value: ch
            }
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
        } else if ("<>=!+-*%&|^/".indexOf(ch1) >= 0) {
            if (ch2 === "=") {
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
            Error.errors.push(Error.unexpected(token));
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
        this.parseList = [];
    }

    Parser.prototype.next = function () {
        var token = null;
        if (this.backs.length) {
            token = this.backs.shift();
        } else {
            token = this.lexer.next();
        }
        this.preToken = token || this.preToken;
        this.putBackToken = token;
        return token;
    }

    Parser.prototype.nextMatch = function (value) {
        var token = this.next() || {};
        value = value instanceof Array ? value : [value];
        if (value.indexOf(token.value) == -1) {
            Error.errors.push(Error.expected(token, value));
        }
        return true;
    }

    Parser.prototype.nextMatchType = function (type) {
        var token = this.next() || {};
        type = type instanceof Array ? type : [type];
        if (type.indexOf(token.type) == -1) {
            Error.errors.push(Error.expected(token, type));
        }
        return true;
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

    Parser.prototype.hasNext = function () {
        return this.backs.length || this.lexer.hasNext();
    }

    Parser.prototype.pubBack = function () {
        this.putBackToken && this.backs.push(this.putBackToken);
    }

    // 代码块
    Parser.prototype.parseStmt = function (stopValue) {
        while (this.hasNext()) {
            var lookahead = this.peek();
            if (this.preToken && this.preToken.line == lookahead.line &&
                this.preToken.value != '{' && this.preToken.value != '}' &&
                lookahead.value != ';') { //两条语句在同一行，且没有分隔符
                Error.errors.push(Error.expectedSeparator(lookahead));
            }
            if (lookahead.value == ';') {
                this.next();
                lookahead = this.peek();
            }
            if (lookahead.value === stopValue || !lookahead.value) {
                break;
            }
            switch (lookahead.value) {
                case 'var':
                case 'let':
                case 'const':
                    this.parseDeclareStmt();
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
                case 'function':
                    this.parseFunction();
                    break;
                case 'class':
                    this.parseClass();
                    break;
                case '{':
                    if (this.peek(2).value === ':') { //对象字面量
                        this.parseObject();
                    } else { //代码块
                        this.parseBlock();
                    }
                    break;
                case 'continue':
                case 'break':
                    this.parseControlStmt();
                    break;
                case 'return':
                    this.parseReturnStmt();
                    break;
                default:
                    if (this.lexer.isAssignOperator(lookahead)) { //赋值语句
                        this.parseAssignStmt(lookahead.value);
                    } else {
                        this.parseExpr();
                    }
                    break;
            }
        }
    }

    // 代码块
    Parser.prototype.parseBlock = function () {
        this.nextMatch('{');
        this.parseStmt('}');
        this.nextMatch('}');
    }

    // 对象字面量
    Parser.prototype.parseObject = function () {
        this.nextMatch('{');
        while (this.hasNext() && this.peek().value != '}') {
            this.nextMatchType([TokenType.NUMBER, TokenType.STRING, TokenType.IDENTIFIER]);
            this.nextMatch(':');
            this.parseExpr();
        }
        this.nextMatch('}');
    }

    // 声明语句
    Parser.prototype.parseDeclareStmt = function () {
        this.nextMatch(['var', 'let', 'const']);
        this.nextMatchType(TokenType.IDENTIFIER);
        if (this.peek().value === '=') {
            this.parseAssignStmt('=', ',');
        }
    }

    // 赋值语句
    Parser.prototype.parseAssignStmt = function (value, stopValue) {
        value = value || '';
        if (!this.preToken || this.preToken.type !== TokenType.IDENTIFIER) {
            Error.errors.push(Error.expectedIdentifier(token));
        }
        this.nextMatch(value);
        if (this.peek().value === 'function') {
            this.parseFunction();
        } else {
            this.parseExpr(stopValue);
        }
    }

    // import语句
    Parser.prototype.parseImportStmt = function () {
        var lookahead = null;
        this.nextMatch('import');
        lookahead = this.peek();
        if (lookahead.value === '{') { //import {a,b,c} from 'test'
            this.next();
            this.nextMatchType(TokenType.IDENTIFIER);
            while (this.hasNext() && this.peek().value != '}') {
                this.nextMatch(',');
                this.nextMatchType(TokenType.IDENTIFIER);
                if (this.peek().value === 'as') {
                    this.next();
                    this.nextMatchType(TokenType.IDENTIFIER);
                }
            }
        } else if (lookahead.value === '*') { //import * as a from 'test'
            this.next();
            this.nextMatch('as');
            this.nextMatchType(TokenType.IDENTIFIER);
        } else { //import a from 'test'
            this.nextMatchType(TokenType.IDENTIFIER);
        }
        this.nextMatch('from');
        this.nextMatchType(TokenType.STRING);
    }

    // export语句
    Parser.prototype.parseExportStmt = function () {
        var lookahead = null;
        this.nextMatch('export');
        lookahead = this.peek();
        if (lookahead.value === 'function') { //export function test
            this.next();
            this.parseFunction();
        } else if (lookahead.value === 'default') { //export default test
            this.next();
            lookahead = this.peek();
            if (lookahead.value == 'function') { //export default function
                this.parseFunction();
            } else {
                this.parseExpr();
            }
        } else if (lookahead.value === '{') { //export {a,b,c} from 'test'
            this.next();
            this.nextMatchType(TokenType.IDENTIFIER);
            while (this.hasNext() && this.peek().value != '}') {
                this.nextMatch(',');
                this.nextMatchType(TokenType.IDENTIFIER);
                if (this.peek().value === 'as') { //export {a as b} from 'test'
                    this.next();
                    this.nextMatchType(TokenType.IDENTIFIER);
                }
            }
            if (this.peek().value === 'from') {
                this.next();
                this.nextMatchType(TokenType.STRING);
            }
        } else if (lookahead.value === '*') { //export * as a from 'test'
            this.next();
            if (this.peek().value === 'as') {
                this.nextMatch('as');
                this.nextMatchType(TokenType.IDENTIFIER);
            }
            this.nextMatch('from');
            this.nextMatchType(TokenType.STRING);
        } else { //export let a=1,b,c
            this.nextMatch(['var', 'let', 'const']);
            this.nextMatchType(TokenType.IDENTIFIER);
            if (this.peek().value === '=') {
                this.parseAssignStmt('=', ',');
            }
            while (this.peek().value == ',') {
                this.nextMatchType(TokenType.IDENTIFIER);
                if (this.peek().value === '=') {
                    this.parseAssignStmt('=', ',');
                }
            }
        }
    }

    // if语句
    Parser.prototype.parseIfStmt = function () {
        var that = this;
        this.nextMatch('if');
        _nextExpr();
        this.parseBlock();
        if (this.peek().value === 'else') {
            this.next();
            if (this.peek().value === 'if') {
                this.parseIfStmt();
            } else {
                this.parseBlock();
            }
        }

        function _nextExpr() {
            that.nextMatch('(');
            that.parseExpr();
            that.nextMatch(')');
        }
    }

    // with语句
    Parser.prototype.parseWithStmt = function () {
        this.nextMatch('with');
        this.nextMatch('(');
        this.parseExpr();
        this.nextMatch(')');
        this.parseBlock();
    }

    // while语句
    Parser.prototype.parseWhileStmt = function () {
        this.parseList.push('while');
        this.nextMatch('while');
        this.nextMatch('(');
        this.parseExpr();
        this.nextMatch(')');
        this.parseBlock();
        this.parseList.pop();
    }

    // do while语句
    Parser.prototype.parseDoStmt = function () {
        this.parseList.push('do');
        this.nextMatch('do');
        this.nextMatch('(');
        this.parseExpr();
        this.nextMatch(')');
        this.parseBlock();
        this.nextMatch('while');
        this.nextMatch('(');
        this.parseExpr();
        this.nextMatch(')');
        this.parseList.pop();
    }

    // try catch语句
    Parser.prototype.parseTryStmt = function () {
        this.nextMatch('try');
        this.parseBlock();
        this.nextMatch('catch');
        this.nextMatch('(');
        this.nextMatchType(TokenType.IDENTIFIER);
        this.nextMatch(')');
        this.parseBlock();
    }

    // for语句
    Parser.prototype.parseForStmt = function () {
        this.parseList.push('for');
        this.nextMatch('for');
        this.nextMatch('(');
        if (this.peek(2).value == 'in' || this.peek(3).value == 'in') { //for in语句
            if (this.peek(3).value == 'in') {
                this.nextMatch(['var', 'let', 'const']);
            }
            this.nextMatchType(TokenType.IDENTIFIER);
            this.nextMatch('in');
            this.parseExpr();
        } else {
            this.peek().value != ';' && this.parseExpr();
            this.nextMatch(';');
            this.peek().value != ';' && this.parseExpr();
            this.nextMatch(';');
            this.peek().value != ')' && this.parseExpr();
        }
        this.nextMatch(')');
        this.parseBlock();
        this.parseList.pop();
    }

    // 函数声明
    Parser.prototype.parseFunction = function () {
        var needName = !this.preToken || ['(', '=', 'default'].indexOf(this.preToken.value) == -1;
        this.nextMatch('function');
        if (this.peek().type === TokenType.IDENTIFIER || needName) {
            this.nextMatchType(TokenType.IDENTIFIER);
        }
        this.parseFunArgs();
    }

    // 类声明
    Parser.prototype.parseClass = function () {
        var needName = !this.preToken || ['(', '=', 'default'].indexOf(this.preToken.value) == -1;
        this.nextMatch('class');
        if (this.peek().type === TokenType.IDENTIFIER || needName) {
            this.nextMatchType(TokenType.IDENTIFIER);
        }
        if (this.peek().value === 'extends') {
            this.next();
            this.nextMatchType(TokenType.IDENTIFIER);
        }
        this.nextMatch('{');
        while (this.hasNext() && this.peek().value != '}') {
            if (this.peek(2).value === '=') { //属性
                this.nextMatchType(TokenType.IDENTIFIER);
                this.parseAssignStmt();
            } else { //方法
                if (this.peek().value === 'static' || this.peek().value === 'get') {
                    this.next();
                }
                this.nextMatchType(TokenType.IDENTIFIER);
                this.parseFunArgs();
            }
        }
        this.nextMatch('}');
    }

    // 函数参数
    Parser.prototype.parseFunArgs = function () {
        this.nextMatch('(');
        while (this.hasNext() && this.peek().value != ')') {
            this.nextMatchType(TokenType.IDENTIFIER);
            this.nextMatch(',');
        }
        this.nextMatch(')');
        this.parseBlock();
    }

    // break,continu
    Parser.prototype.parseControlStmt = function () {
        var lookahead = this.next();
        if (lookahead.value === 'continue') {
            if (!this.checkIn(['for', 'while', 'do'])) {
                Error.errors.push(Error.unexpected(lookahead));
            }
        } else if (lookahead.value === 'break') {
            if (!this.checkIn(['for', 'while', 'do', 'case'])) {
                Error.errors.push(Error.unexpected(lookahead));
            }
        }
        this.next();
    }

    // return语句
    Parser.prototype.parseReturnStmt = function () {
        this.nextMatch('return');
        this.parseExpr();
    }

    Parser.prototype.checkIn = function (value) {
        value = value instanceof Array ? value : [value];
        for (var i = this.parseList.length; i >= 0; i++) {
            if (value.indexOf(this.parseList[i]) > -1) {
                return true;
            }
        }
        return false;
    }

    // 表达式分析
    Parser.prototype.parseExpr = function (stopValue) {
        var originToken = this.peek();
        var lookahead = null;
        if (!this.hasNext()) {
            Error.errors.push(Error.expected(null, 'expression'));
            return;
        }
        while (this.hasNext()) {
            this.parseValue();
            lookahead = this.peek();
            if (lookahead.value === '.') { //点运算符
                this.parseDot();
                lookahead = this.peek();
            }
            if (lookahead.value === stopValue) {
                break;
            }
            if (lookahead.type != TokenType.OPERATOR) { //下一个不是运算符，表达式结束
                if (lookahead.value == ',') { //下一个表达式
                    this.next();
                    if (this.lexer.isAssignOperator(this.peek(2))) {
                        this.nextMatchType(TokenType.IDENTIFIER);
                        this.parseAssignStmt(lookahead.value);
                    } else {
                        this.parseExpr();
                    }
                }
                break;
            }
            if (this.lexer.isAssignOperator(lookahead)) { //赋值运算符
                break;
            }
            this.next();
            if (!this.hasNext()) { //表达式未结束
                Error.errors.push(Error.unexpected(this.preToken));
            }
        }
        if (this.peek() === originToken) { //非表达式
            Error.errors.push(Error.unexpected(originToken));
            this.next();
        }
    }

    Parser.prototype.parseValue = function () {
        var token = this.next();
        if (['+', '-'].indexOf(token.value) > -1) { //前置运算符:+1,-1
            token = this.next();
        } else if (token.value === '!') { //前置运算符:!a
            while (token.value === '!') {
                token = this.next();
            }
        } else if (['++', '--'].indexOf(token.value) > -1) { //前置运算符:++a,--a
            token = this.next();
            if (!this.lexer.isVariable(token)) {
                Error.errors.push(Error.expectedIdentifier(token));
            }
        } else if (['(', ']'].indexOf(token.value) == -1 && ['++', '--'].indexOf(this.peek().value) > -1) { //后置运算符
            this.next();
            if (!this.lexer.isVariable(token)) { //1++，非法
                Error.errors.push(Error.expectedIdentifier(token))
            }
        }
        if (token.value === '(') { //括号表达式(1+2)
            this.parseExpr();
            this.nextMatch(')')
        } else if (this.peek().value === '(') { //函数调用test()
            this.next();
            this.peek().value !== ')' && this.parseExpr();
            this.nextMatch(')')
        } else if (token.value === '[') { //数组
            this.peek().value !== ']' && this.parseExpr();
            this.nextMatch(']');
        } else if (this.peek().value === '[') { //属性表达式
            this.next();
            this.parseExpr();
            this.nextMatch(']');
        } else if (token.value === 'new') { //new对象
            this.next();
            this.nextMatchType(TokenType.IDENTIFIER);
            if (this.peek().value === '(') { //new Object(test);
                this.next();
                this.parseExpr();
                this.nextMatch(')');
            }
        } else if (!this.lexer.isValue(token)) { //非标识符
            Error.errors.push(Error.expectedIdentifier(token));
        }
    }

    // 点运算符
    Parser.prototype.parseDot = function () {
        if (!this.lexer.isVariable(this.preToken) && [']', ')'].indexOf(this.preToken.value) === -1) {
            Error.errors.push(Error.expectedIdentifier(this.preToken));
        }
        while (this.hasNext()) {
            this.nextMatch('.');
            this.nextMatchType(TokenType.IDENTIFIER);
            if (this.peek().value === '(') { //函数调用test()
                this.next();
                this.peek().value !== ')' && this.parseExpr();
                this.nextMatch(')')
            }
            if (this.peek().value !== '.') {
                break;
            }
        }
    }

    var lexer = new Lexer();
    var parser = new Parser(lexer);
    if (text) {
        lexer.reset(text);
        parser.parseStmt();
        console.log(Error.errors.join('\n'));
    }
}