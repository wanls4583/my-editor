import {
    lastIndexOf
} from "core-js/fn/array";
import {
    toExponential
} from "core-js/fn/number/epsilon";
import {
    iterator
} from "core-js/fn/symbol";

/*
 * @Author: lisong
 * @Date: 2022-01-07 10:07:14
 * @Description: 
 */
export default function () {
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
        BRACKET: 7
    }
    var ErrorType = {
        UNEXPECTED: 1,
        EXPECTED: 2,
        MISS: 3
    }

    function Error(token, type, param) {
        this.type = type,
            this.param = param,
            this.line = token.line,
            this.column = token.column,
            this.value = token.value
    }

    // 词法分析器
    function Lexer(text) {
        this.lines = text.split('\n');
        this.input = this.lines[0];
        this.line = 1;
        this.column = 0
        this.errors = [];
        this.init();
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
            this.line == this.lines.length && this.lines.peek().length < this.column
    }

    Lexer.prototype.isVariable = function (token) {
        return token.type == TokenType.IDENTIFIER;
    }

    Lexer.prototype.isValue = function (token) {
        return this.isScalar(token) || this.isVariable(token);
    }

    Lexer.prototype.isType = function (token) {
        return (
            token.value === "bool" ||
            token.value === "int" ||
            token.value === "float" ||
            token.value === "void" ||
            token.value === "string"
        );
    }

    Lexer.prototype.isScalar = function (token) {
        return (
            token_type == TokenType.NUMBER ||
            token_type == TokenType.STRING ||
            token_type == TokenType.BOOLEAN
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

    Lexer.prototype.sacnOperator = function () {
        var ch1 = this.input[0];
        var ch2 = this.input[1];
        var ch3 = this.input[2];
        var ch4 = this.input[3];
        if (ch1 === ">" && ch2 === ">" && ch3 === ">" && ch4 === "=") {
            return {
                type: TokenType.OPERATOR,
                value: ">>>="
            };
        }
        if (ch1 === "=" && ch2 === "=" && ch3 === "=") {
            return {
                type: TokenType.OPERATOR,
                value: "==="
            };
        }
        if (ch1 === "!" && ch2 === "=" && ch3 === "=") {
            return {
                type: TokenType.OPERATOR,
                value: "!=="
            };
        }
        if (ch1 === ">" && ch2 === ">" && ch3 === ">") {
            return {
                type: TokenType.OPERATOR,
                value: ">>>"
            };
        }
        if (ch1 === "<" && ch2 === "<" && ch3 === "=") {
            return {
                type: TokenType.OPERATOR,
                value: "<<="
            };
        }
        if (ch1 === ">" && ch2 === ">" && ch3 === "=") {
            return {
                type: TokenType.OPERATOR,
                value: ">>="
            };
        }
        if (ch1 === "=" && ch2 === ">") {
            return {
                type: TokenType.OPERATOR,
                value: '=>'
            };
        }
        if (ch1 === ch2 && ("+-<>&|*".indexOf(ch1) >= 0)) {
            if (ch1 === "*" && ch3 === "=") {
                return {
                    type: TokenType.OPERATOR,
                    value: ch1 + ch2 + ch3
                };
            }

            return {
                type: TokenType.OPERATOR,
                value: ch1 + ch2
            };
        }
        if ("<>=!+-*%&|^/".indexOf(ch1) >= 0) {
            if (ch2 === "=") {
                return {
                    type: TokenType.OPERATOR,
                    value: ch1 + ch2
                };
            }

            return {
                type: TokenType.OPERATOR,
                value: ch1
            };
        }
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
            token = this.scanIdentifier() || this.scanBracket() || this.sacnOperator() || this.scanString();
            if (!token) { //存在非法变量
                this.scanUnexpected();
                return this.token();
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

    Parser.prototype.peek = function () {
        if (this.backs.length) {
            return this.backs[0];
        }
        var token = this.lexer.next();
        token && this.backs.push(token);
        return token;
    }

    Parser.prototype.hasNext = function () {
        return this.peek();
    }

    Parser.prototype.pubBack = function () {
        this.preToken && this.backs.push(this.preToken);
    }

    // 表达式分析
    Parser.prototype.parseExpr = function () {
        var token = null;
        token = this.next();
        if (token.value == '+' || token.value == '-') {
            token = this.next();
        }
        while (this.hasNext() && token.type != TokenType.IDENTIFIER) {
            this.errors.push(new Error(token, ErrorType.EXPECTED, ['identifier']));
            token = this.next();
        }
        while (this.hasNext()) {
            token = this.peek();
            if (token.type != TokenType.OPERATOR && !this.lexer.isValue(token)) { //不是运算符和值，解析结束
                break;
            }
            if (this.lexer.isValue(token) && this.lexer.isValue(this.preToken)) { //相邻的两个值
                if (token.line > this.preToken.line) { //在不同的行，说明表达式结束
                    break;
                }
                this.errors.push(new Error(token, ErrorType.MISS, [';']));
            }
            this.next();
            if (token.value === '++' || token.value === '--') {
                if (!this.lexer.isVariable(token)) {
                    this.errors.push(new Error(token, ErrorType.UNEXPECTED));
                    continue;
                }
            }
            if (token.type === this.preToken.type == TokenType.OPERATOR) {
                this.errors.push(new Error(token, ErrorType.UNEXPECTED));
                continue;
            }
            this.preToken = token;
        }
    }

    // 声明语句
    Parser.prototype.parseDeclareStmt = function () {
        if (this.hasNext() && ['var', 'let', 'const'].indexOf(this.peek().value) > -1) {
            this.next();
            this.parseAssignStmt();
        }
    }

    // 赋值语句
    Parser.prototype.parseAssignStmt = function () {
        if (this.hasNext() && this.peek().value == '=') {
            this.next();
            this.parseExpr();
        }
    }

    // 函数声明
    Parser.prototype.parseFunction = function () {
        if (this.hasNext() && this.peek().value == 'function') {
            var needName = !this.preToken || this.preToken.type != TokenType.OPERATOR && this.preToken.value != '(';
            var token = this.next();
            if (!this.hasNext()) {
                this.errors.push(new Error(token, ErrorType.EXPECTED, ['(']));
                return;
            }
            if (needName) {
                if (token.type != TokenType.IDENTIFIER) {
                    this.errors.push(new Error(token, ErrorType.EXPECTED, ['identifier']));
                    if (token.value == '(') {
                        this.pubBack();
                    }
                }
            }
            this.parseFunArgs();
        }
    }

    // 函数参数
    Parser.prototype.parseFunArgs = function() {
        while (this.hasNext() && this.next().value != '(') {
            this.errors.push(new Error(token, ErrorType.EXPECTED, ['(']));
        }
    }
}