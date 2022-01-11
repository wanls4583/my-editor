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
        "debugger", "instanceof", "true", "false", "null", "undefined", "async", "await"
    ];
    var assignOperator = ['=', '>>>=', '>>=', '<<=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='];
    var binaryOperator = [
        '+', '-', '*', '/', '%', '&', '|', '^', '&&', '||', '===', '==', '!=', '!==',
        '>', '>=', '<', '<=', '>>', '>>>', '<<', 'instanceof'
    ];
    var unitOperator = ['+', '-', '~', '!', 'typeof', 'delete', 'void'];
    var brackets = ['{', '}', '[', ']', '(', ')'];
    var regs = {
        space: /^\s+/,
        number: /^\d+\b/,
        identifier: /^[a-zA-Z_$][a-zA-Z0-9_$]*\b/,
        comment: /\*\//,
        string1: /\\*'/,
        string2: /\\*"/,
        string3: /\\*`/,
        regex: /^\/[\s\S]*?[^\\]\//,
        other: /^[^\s]+?/
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

    Error.unmatch = function (token) {
        return new Error(token, ErrorType.UNMATCH);
    }

    // 词法分析器
    function Lexer(text) {
        this.init();
        this.reset(text);
    }

    Lexer.prototype.init = function () {
        this.assignOperatorMap = {};
        this.unitOperatorMap = {};
        this.binaryOperatorMap = {};
        this.keywordsMap = new Map();
        this.bracketsMap = new Map();
        assignOperator.map((item) => {
            this.assignOperatorMap[item] = true;
        });
        unitOperator.map((item) => {
            this.unitOperatorMap[item] = true;
        });
        binaryOperator.map((item) => {
            this.binaryOperatorMap[item] = true;
        });
        keywords.map((item) => {
            this.keywordsMap.set(item, true);
        });
        brackets.map((item) => {
            this.bracketsMap.set(item, true);
        });
    }

    Lexer.prototype.reset = function (text) {
        this.lines = text && text.split('\n') || [''];
        this.input = this.lines[0];
        this.line = 1;
        this.column = 0
        Error.errors = [];
    }

    Lexer.prototype.skip = function (length) {
        this.input = length ? this.input.slice(length) : this.input;
        if (!this.input.length) {
            while (!this.input.length && this.line <= this.lines.length) {
                this.line++;
                this.column = 0;
                this.input = this.lines[this.line - 1] || '';
            }
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
            token.type == TokenType.REGEXP ||
            token.value === 'this' ||
            token.value === 'null' ||
            token.value === 'undefined'
        );
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

    Lexer.prototype.scanSpace = function () {
        var exec = regs.space.exec(this.input);
        if (exec) {
            this.skip(exec.index + exec[0].length);
            exec.index >= this.input.length - 1 && this.scanSpace();
        }
    }

    Lexer.prototype.scanComment = function () {
        var exec = null;
        var ch1 = null;
        var ch2 = null;
        this.skip(0); //去掉空行
        this.scanSpace(); //去掉空格
        ch1 = this.input[0];
        ch2 = this.input[1];
        if (ch1 === '/' && ch2 == '/') {
            this.skipLine(1);
            this.scanComment();
        } else if (ch1 === '/' && ch2 === '*') {
            this.skip(2);
            while (!(exec = regs.comment.exec(this.input))) {
                this.skipLine(1);
            }
            exec && this.skip(exec.index + exec[0].length);
        }
    }

    Lexer.prototype.scanString = function () {
        var that = this;
        var exec = null;
        var token = null;
        if (this.input[0] === '\'') {
            token = _token(this.line, this.column, '\'');
            this.skip(1);
            if (!_end(regs.string1)) {
                Error.errors.push(Error.unmatch(token));
            }
            return token;
        } else if (this.input[0] === '"') {
            token = _token(this.line, this.column, '"');
            this.skip(1);
            if (!_end(regs.string2)) {
                Error.errors.push(Error.unmatch(token));
            }
        } else if (this.input[0] === '`') {
            token = _token(this.line, this.column, '`');
            this.skip(1);
            while (this.hasNext()) {
                exec = regs.string3.exec(this.input)
                if (!exec || exec[0].length % 2 === 0) { //含有基数个\：\\\`
                    this.skipLine(1);
                } else {
                    this.skip(exec.index + exec[0].length);
                    break;
                }
            }
            if (!(exec && exec[0].length % 2 === 1)) { //未匹配到结束符
                Error.errors.push(Error.unmatch(token));
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
            this.skip(exec.index + exec[0].length);
        }
        return token;
    }

    Lexer.prototype.scanIdentifier = function () {
        var exec = null;
        var token = null;
        if (exec = regs.identifier.exec(this.input)) {
            token = {
                type: this.isKeyWord(exec[0]) ? TokenType.KEYWORD : TokenType.IDENTIFIER,
                line: this.line,
                column: this.column,
                value: exec[0]
            }
            if (token.value === 'true' || token.value === 'false') {
                token.type = TokenType.BOOLEAN;
            }
            this.skip(exec.index + exec[0].length);
        }
        return token;
    }

    Lexer.prototype.scanBracket = function () {
        var token = null;
        var ch = this.input[0];
        if (this.isBracket(ch)) {
            token = {
                type: TokenType.BRACKET,
                line: this.line,
                column: this.column,
                value: ch
            }
            this.skip(1);
        }
        return token;
    }

    Lexer.prototype.scanRegex = function () {
        var exec = null;
        var token = null;
        if (exec = regs.regex.exec(this.input)) {
            token = {
                type: TokenType.REGEXP,
                line: this.line,
                column: this.column,
                value: exec[0]
            }
            this.skip(exec.index + exec[0].length);
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
            } else {
                token = {
                    type: TokenType.OPERATOR,
                    value: ch1 + ch2
                };
            }
        } else if ("<>=!+-*%&|^/".indexOf(ch1) >= 0) {
            if (ch2 === "=") {
                token = {
                    type: TokenType.OPERATOR,
                    value: ch1 + ch2
                };
            } else {
                token = {
                    type: TokenType.OPERATOR,
                    value: ch1
                };
            }
        } else if ('?:.,;'.indexOf(ch1) > -1) {
            token = {
                type: TokenType.PUNCTUATOR,
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
        var token = null;
        if (exec = regs.other.exec(this.input)) {
            token = {
                type: TokenType.OTHER,
                line: this.line,
                column: this.column,
                value: exec[0]
            }
            this.skip(exec.index + exec[0].length);
        }
        return token
    }

    Lexer.prototype.next = function () {
        var token = null;
        this.scanComment();
        if (this.hasNext()) {
            token =
                this.scanIdentifier() ||
                this.scanBracket() ||
                this.scanNunmber() ||
                this.scanRegex() ||
                this.scanOperator() ||
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
        this.reset();
    }

    Parser.prototype.reset = function () {
        this.backs = [];
        this.parseList = [];
        this.preToken = null;
        this.putBackToken = null;
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
            this.preToken = token || this.preToken;
            this.putBackToken = token;
            length--;
        }
        return token;
    }

    Parser.prototype.nextMatch = function (value) {
        var token = this.next() || {};
        var pass = false;
        value = value._isArray ? value : [value];
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
        !pass && Error.errors.push(Error.expected(token, value));
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

    Parser.prototype.hasNext = function () {
        var lookahead = this.peek();
        return lookahead.value
    }

    Parser.prototype.putBack = function () {
        this.putBackToken && this.backs.unshift(this.putBackToken);
    }

    // 代码块
    Parser.prototype.parseStmt = function (stopValue) {
        var count = 0;
        var startTime = Date.now();
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
            if (stopValue && stopValue.indexOf(lookahead.value) > -1 || !lookahead.value) {
                break;
            }
            switch (lookahead.value) {
                case 'var':
                case 'let':
                case 'const':
                    this.parseDeclareStmt();
                    break;
                case '{':
                    if (this.peek(2).value === ':') { //对象字面量
                        this.parseObject();
                    } else { //代码块
                        this.parseBlock();
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
                case 'function':
                    this.parseFunction();
                    break;
                case 'class':
                    this.parseClass();
                    break;
                case 'continue':
                case 'break':
                    this.parseControlStmt();
                    break;
                case 'return':
                    this.parseReturnStmt();
                    break;
                default:
                    this.parseExpr();
                    break;
            }
            if (++count % 10 === 0 && Date.now() - startTime > 200) {
                this.parseTimer = setTimeout(() => {
                    this.parseStmt(stopValue);
                }, 10);
            }
        }
    }

    // 代码块
    Parser.prototype.parseBlock = function () {
        this.nextMatch('{');
        this.parseStmt(['}']);
        this.nextMatch('}');
    }

    // 对象字面量
    Parser.prototype.parseObject = function () {
        this.nextMatch('{');
        while (this.hasNext() && this.peek().value != '}') {
            this.nextMatch([TokenType.NUMBER, TokenType.STRING, TokenType.IDENTIFIER]);
            this.nextMatch(':');
            if (this.peek().value === 'function') {
                this.parseFunction();
            } else {
                this.parseExpr([',']);
            }
            if (this.peek().value != '}') {
                this.nextMatch(',');
            }
        }
        this.preToken.value === ',' && Error.errors.push(Error.unexpected(this.preToken));
        this.nextMatch('}');
    }

    // 声明语句
    Parser.prototype.parseDeclareStmt = function () {
        this.nextMatch(['var', 'let', 'const']);
        this.nextMatch(TokenType.IDENTIFIER);
        if (this.peek().value === '=') {
            this.parseAssignStmt('=', [',']);
        }
    }

    // 赋值语句
    Parser.prototype.parseAssignStmt = function (value, stopValue) {
        value = value || '=';
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
            this.nextMatch(TokenType.IDENTIFIER);
            while (this.hasNext() && this.peek().value != '}') {
                this.nextMatch(',');
                this.nextMatch(TokenType.IDENTIFIER);
                if (this.peek().value === 'as') {
                    this.next();
                    this.nextMatch(TokenType.IDENTIFIER);
                }
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
            } else if (lookahead.value === 'class') {
                this.parseClass();
            } else {
                this.parseExpr();
            }
        } else if (lookahead.value === '{') { //export {a,b,c} from 'test'
            this.next();
            this.nextMatch(TokenType.IDENTIFIER);
            while (this.hasNext() && this.peek().value != '}') {
                this.nextMatch(',');
                this.nextMatch(TokenType.IDENTIFIER);
                if (this.peek().value === 'as') { //export {a as b} from 'test'
                    this.next();
                    this.nextMatch(TokenType.IDENTIFIER);
                }
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
            this.nextMatch(['var', 'let', 'const']);
            this.nextMatch(TokenType.IDENTIFIER);
            if (this.peek().value === '=') {
                this.parseAssignStmt('=', ',');
            }
            while (this.peek().value == ',') {
                this.nextMatch(TokenType.IDENTIFIER);
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

    // switch语句
    Parser.prototype.parseSwitchStmt = function () {
        this.parseList.push('switch');
        this.nextMatch('switch');
        this.nextMatch('(');
        this.parseExpr();
        this.nextMatch(')');
        this.nextMatch('{');
        while (this.hasNext() && this.peek().value != '}') {
            if (this.peek().value === 'default') {
                this.nextMatch('default');
            } else {
                this.nextMatch('case');
                this.parseExpr();
            }
            this.nextMatch(':');
            this.parseStmt(['case', 'break', '}']);
            if (this.peek().value === 'break') {
                this.next();
                while (this.peek().value === ';') {
                    this.next();
                }
                if (['}', 'case', 'default'].indexOf(this.peek().value) == -1) { //break后面只能跟随case
                    Error.errors.push(Error.expected(this.peek(), 'case'));
                    while (this.hasNext() && ['}', 'case'].indexOf(this.peek().value) == -1) {
                        this.next();
                    }
                }
            }
        }
        this.nextMatch('}');
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
        this.nextMatch(TokenType.IDENTIFIER);
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
            this.nextMatch(TokenType.IDENTIFIER);
            this.nextMatch('in');
            this.parseExpr();
        } else {
            if (['var', 'let', 'const'].indexOf(this.peek().value) > -1) {
                this.parseDeclareStmt();
            } else if (this.peek().value != ';') {
                this.parseExpr();
            }
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
        var needName = !this.preToken || ['(', '=', ':', 'default'].indexOf(this.preToken.value) == -1;
        this.nextMatch('function');
        if (this.peek().type === TokenType.IDENTIFIER || needName) {
            this.nextMatch(TokenType.IDENTIFIER);
        }
        this.parseFunArgs();
        this.parseBlock();
    }

    // 类声明
    Parser.prototype.parseClass = function () {
        var needName = !this.preToken || ['(', '=', 'default'].indexOf(this.preToken.value) == -1;
        this.nextMatch('class');
        if (this.peek().type === TokenType.IDENTIFIER || needName) {
            this.nextMatch(TokenType.IDENTIFIER);
        }
        if (this.peek().value === 'extends') {
            this.next();
            this.nextMatch(TokenType.IDENTIFIER);
        }
        this.nextMatch('{');
        while (this.hasNext() && this.peek().value != '}') {
            if (this.peek(2).value === '=') { //属性
                this.nextMatch(TokenType.IDENTIFIER);
                this.parseAssignStmt('=');
            } else { //方法
                if (this.peek().value === 'static' || this.peek().value === 'get') {
                    this.next();
                }
                this.nextMatch(TokenType.IDENTIFIER);
                this.parseFunArgs();
                this.parseBlock();
            }
        }
        this.nextMatch('}');
    }

    // 函数参数
    Parser.prototype.parseFunArgs = function () {
        this.nextMatch('(');
        if (this.peek().value != ')') {
            this.nextMatch(TokenType.IDENTIFIER);
        }
        while (this.hasNext() && this.peek().value != ')') {
            this.nextMatch(',');
            this.nextMatch(TokenType.IDENTIFIER);
        }
        this.nextMatch(')');
    }

    // break,continu
    Parser.prototype.parseControlStmt = function () {
        var lookahead = this.next();
        if (lookahead.value === 'continue') {
            if (!this.checkIn(['for', 'while', 'do'])) {
                Error.errors.push(Error.unexpected(lookahead));
            }
        } else if (lookahead.value === 'break') {
            if (!this.checkIn(['for', 'while', 'do'])) {
                Error.errors.push(Error.unexpected(lookahead));
            }
        }
        this.next();
    }

    // return语句
    Parser.prototype.parseReturnStmt = function () {
        var lookahead = null;
        this.nextMatch('return');
        lookahead = this.peek();
        if (lookahead.value !== ';' && lookahead.value !== '}') {
            this.parseExpr();
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
        var regex = this.next();
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
            if (this.parseValue() === false) { //前面非标识符
                break;
            }
            lookahead = this.peek();
            if (lookahead.value === '.') { //点运算符
                this.parseDot();
                lookahead = this.peek();
            }
            if (lookahead.value === '?') { //三元运算符
                this.nextMatch('?');
                this.parseExpr();
                this.nextMatch(':');
                continue;
            }
            if (this.lexer.isAssignOperator(lookahead)) { //赋值运算符
                if (this.preToken.type !== TokenType.IDENTIFIER) {
                    Error.errors.push(Error.expectedIdentifier(this.preToken));
                }
                this.parseAssignStmt(lookahead.value);
                break;
            }
            if (stopValue && stopValue.indexOf(lookahead.value) > -1) { //遇到停止符
                break;
            }
            if (!this.lexer.isBinaryOperator(lookahead)) { //下一个不是二元运算符，表达式结束
                if (lookahead.value == ',') { //下一个表达式
                    this.next();
                    if (this.lexer.isAssignOperator(this.peek(2))) {
                        this.nextMatch(TokenType.IDENTIFIER);
                        this.parseAssignStmt(lookahead.value);
                    } else {
                        this.parseExpr();
                    }
                }
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
        var lookahead = this.peek();
        if (this.lexer.isUnitOperator(token)) { //一元运算符:+1,-1
            if (token.value === '!') {
                while (token.value === '!') {
                    token = this.next();
                }
            } else {
                token = this.next();
            }
        } else if (token.value === '++' || token.value === '--') { //前置运算符:++a,--a
            token = this.next();
            if (!this.lexer.isVariable(token)) {
                Error.errors.push(Error.expectedIdentifier(token));
            }
        } else if (token.value !== ')' && token.value !== ']' &&
            (lookahead.value === '++' || lookahead.value === '--')) { //后置运算符
            this.next();
            if (!this.lexer.isVariable(token)) { //1++，非法
                Error.errors.push(Error.expectedIdentifier(token));
            }
        }
        if (!token) {
            return false;
        } else if (token.value === '(') { //括号表达式(1+2)
            var lookLength = 1;
            var lookToken = this.peek(lookLength);
            while (lookToken.value && lookToken.value != ')') {
                lookLength++;
                lookToken = this.peek(lookLength);
            }
            if (lookLength == 2 && this.peek(lookLength - 1).type === TokenType.IDENTIFIER &&
                this.lexer.isAssignOperator(this.peek(lookLength + 1))) { //(a)=1
                this.next(lookLength);
                this.parseAssignStmt(this.peek().value);
            } else if (this.peek(lookLength + 1).value === '=>') { //箭头函数
                this.putBack();
                this.parseFunArgs();
                this.nextMatch('=>');
                this.parseBlock();
                return false;
            } else {
                this.parseExpr();
                this.nextMatch(')');
            }
        } else if (this.peek().value === '(') { //函数调用test()
            this.putBack();
            this.parseCall();
        } else if (this.peek().value === '=>') { //箭头函数test=>{}
            this.next();
            this.parseBlock();
            return false;
        } else if (token.value === '[') { //数组
            this.peek().value !== ']' && this.parseExpr();
            this.nextMatch(']');
        } else if (this.peek().value === '[') { //属性表达式
            this.parseProperty();
        } else if (token.value === 'new') { //new对象
            this.parseCall();
        } else if (token.value == '{') { //对象字面量
            this.putBack();
            this.parseObject();
        } else if (token.type === TokenType.REGEXP) { //正则表达式
            this.putBack();
            this.parseRegex();
        } else if (!this.lexer.isValue(token)) { //非标识符
            Error.errors.push(Error.expectedIdentifier(token));
            return false;
        }
    }

    // 函数调用
    Parser.prototype.parseCall = function () {
        this.nextMatch([TokenType.IDENTIFIER, 'delete']);
        this.nextMatch('(');
        while (this.hasNext() && this.peek().value !== ')') {
            if (this.peek().value === 'function') {
                this.parseFunction();
            } else {
                this.parseExpr([',']);
            }
            if (this.peek().value != ')') {
                this.nextMatch(',');
            }
        }
        this.preToken.value == ',' && Error.errors.push(Error.unexpected(this.preToken));
        this.nextMatch(')')
    }

    // 点运算符
    Parser.prototype.parseDot = function () {
        var lookahead = null;
        if (!this.lexer.isVariable(this.preToken) &&
            this.preToken.type != TokenType.STRING &&
            this.preToken.value != ')' && this.preToken.value != ']') {
            Error.errors.push(Error.expectedIdentifier(this.preToken));
        }
        while (this.hasNext()) {
            this.nextMatch('.');
            this.nextMatch([TokenType.IDENTIFIER, 'delete']);
            lookahead = this.peek();
            if (lookahead.value === '(') { //函数调用test()
                this.putBack();
                this.parseCall();
            } else if (lookahead.value === '[') {
                this.parseProperty();
            }
            lookahead = this.peek();
            if (lookahead.value !== '.') {
                if (lookahead.value === '++' || lookahead.value === '--') {
                    this.next();
                }
                break;
            }
        }
    }

    Parser.prototype.parseProperty = function () {
        this.nextMatch('[');
        this.parseExpr();
        this.nextMatch(']');
        if (this.lexer.isAssignOperator(this.peek())) { //a[b]=1
            this.parseAssignStmt(this.peek().value);
        }
    }

    var lexer = new Lexer();
    var parser = new Parser(lexer);

    return {
        parse: function (text) {
            clearTimeout(parser.parseTimer);
            lexer.reset(text);
            parser.reset();
            parser.parseStmt();
            return Error.errors.map((item) => {
                return {
                    line: item.line,
                    column: item.column,
                    error: item.error
                }
            });
        }
    }
}