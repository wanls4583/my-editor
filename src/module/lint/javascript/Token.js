/*
 * @Author: lisong
 * @Date: 2022-01-05 10:37:04
 * @Description: 
 */
import TokenType from './TokenType';
import AlphabetHelper from './AlphabetHelper';
import Error from './Error';

const Keywords = new Set([
    "var",
    "if",
    "else",
    "for",
    "while",
    "break",
    "func",
    "return",
    "int",
    "float",
    "bool",
    "void",
    "string"
]);

export default class {
    constructor(type, value, end) {
        this._type = type;
        this._value = value;
        this._end = end;
    }
    getType() {
        return this._type;
    }
    getValue() {
        return this._value;
    }
    isScalar() {
        return (
            this._type == TokenType.NUMBER ||
            this._type == TokenType.STRING ||
            this._type == TokenType.BOOLEAN
        );
    }
    isVariable() {
        return this._type == TokenType.VARIABLE;
    }
    isValue() {
        return this.isScalar() || this.isVariable();
    }
    isType() {
        return (
            this._value === "bool" ||
            this._value === "int" ||
            this._value === "float" ||
            this._value === "void" ||
            this._value === "string"
        );
    }
    static makeVarOrKeyword(it) {
        let s = '';
        while (it.hasNext()) {
            const c = it.peek();
            if (AlphabetHelper.isLiteral(c)) {
                s += c;
            } else {
                break;
            }
            it.next();
        }
        if (Keywords.has(s)) {
            return new Token(TokenType.KEYWORD, s, it.index());
        }
        if (s == 'true' || s == 'false') {
            return new Token(TokenType.BOOLEAN, s, it.index());
        }
        return new Token(TokenType.VARIABLE, s, it.index());
    }
    static makeOp(it) {
        let op = it.next();
        let lookahead = it.peek();
        if (lookahead == op) {
            if (['+', '-', '&', '|', '>', '<', '='].indexOf(op) > -1) {
                op += it.next();
                if (['>', '<', '='].indexOf(lookahead) > -1) { //>>=、<<=、===
                    lookahead = it.peek();
                } else {
                    lookahead = null;
                }
            } else if (op == '!') {
                while (it.peek() == lookahead) {
                    op += it.next();
                }
                if (op == '!') { //!=
                    lookahead = it.peek();
                }
            } else {
                return new Error();
            }
        }
        if (lookahead == '=') {
            if (['+', '-', '*', '/', '%', '&', '|', '~', '^', '>', '<', '!', '='].indexOf(op) > -1) {
                op += it.next();
            } else {
                return new Error();
            }
        }
        return new Token(TokenType.OPERATOR, op, it.index());
    }
    static makeNumber(it) {
        let s = '';
        let hasDot = false;
        while (it.hasNext()) {
            let c = it.next();
            let lookahead = it.peek();
            if (AlphabetHelper.isNumber(lookahead)) {
                s += c;
            } else if (c == '.') {
                if (hasDot) {
                    return new Error();
                }
                s += c;
                hasDot = true;
            } else if (!s && (c == '+' || c == '-')) {
                s += c;
            } else {
                break;
            }
        }
        return new Token(TokenType.NUMBER, s, it.index());
    }
}