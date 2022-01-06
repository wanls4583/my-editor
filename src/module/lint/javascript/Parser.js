/*
 * @Author: lisong
 * @Date: 2022-01-05 10:11:25
 * @Description: 
 */
import Util from '@/common/util';
import PeekIterator from '@/common/PeekIterator';
import TokenType from './TokenType';
import Token from './Token';
import Error from './Error';
class Lexer {
    constructor(editor, context) {
        this.initProperties(editor, context)
    }
    initProperties(editor, context) {
        Util.defineProperties(this, context, ['htmls']);
    }
    onInsertContentBefore(nowLine) {}
    onInsertContentAfter(nowLine) {}
    onDeleteContentBefore(nowLine) {}
    onDeleteContentAfter(nowLine) {}
    tokenizeLine(nowLine) {
        let lexError = null;
        let tokens = [];
        let states = [];
        let it = new PeekIterator(this.htmls[nowLine - 1].text);
        if (nowLine > 1 && this.htmls[nowLine - 2].lint.states) {
            states = this.htmls[nowLine - 2].lint.states.slice(0);
        }
        while (it.hasNext()) {
            let token = null;
            let c = it.next();
            let lookahead = it.peek();

            if (c == ' ' || c == '\t') {
                continue;
            }

            if (states.length) { //有未完成的token提取
                let state = states.peek();
                if (state == '/*') { //多行注释
                    if (c != '*' || lookahead != '/') {
                        continue;
                    }
                } else if (state == '\'' || state == '"') { //多行字符串
                    if (c != state) {
                        if (!it.hasNext() && c != '\\') {
                            states.pop();
                            lexError = new Error();
                        }
                        continue;
                    }
                    tokens.push(new Token(TokenType.STRING, state));
                } else if (state == '`') { //模板字符串
                    if (c != state) {
                        continue;
                    }
                    tokens.push(new Token(TokenType.STRING, state));
                }
                states.pop();
                continue;
            }

            // 提取注释的程序
            if (c == "/") {
                if (lookahead == "/") { //单行注释
                    break;
                } else if (lookahead == "*") { //多行注释
                    states.push('/*');
                    continue;
                }
            }

            // 提取模板字符串
            if (c == '\'' || c == '"' || c == '`') {
                states.push(c);
                continue;
            }

            // 括号
            if (c == "{" || c == "}" || c == "(" || c == ")") {
                tokens.push(new Token(TokenType.BRACKET, c));
                continue;
            }

            // 变量
            if (AlphabetHelper.isLetter(c)) {
                it.putBack();
                token = Token.makeVarOrKeyword(it);
                if (token instanceof Error) {
                    lexError = token;
                } else {
                    tokens.push(token);
                }
                continue;
            }

            // 数字
            if (AlphabetHelper.isNumber(c)) {
                it.putBack();
                token = Token.makeNumber(it);
                if (token instanceof Error) {
                    lexError = token;
                } else {
                    tokens.push(token);
                }
                continue;
            }

            if (AlphabetHelper.isOperator(c)) {
                it.putBack();
                token = Token.makeOp(it);
                if (token instanceof Error) {
                    lexError = token;
                } else {
                    tokens.push(token);
                }
                continue;
            }

        }
        return {
            states: states,
            tokens: tokens,
            error: lexError,
        }
    }
    parse(it, line) {
        let tokens = [];
        if (line > 1) {
            tokens = this.htmls[line - 2].lint;
            tokens = tokens && tokens.parser.tokens || [];
        }
        let lastToken = tokens.peek();
        if(lastToken) {
            let lookahead = it.peek();
            if(lastToken.isValue()) {
                if(lookahead && token.getType() == TokenType.OPERATOR) {
                    this.parseExpr(it, tokens);
                } else {
                    lastToken = tokens.peek(2);
                }
            } else if(lastToken.getType() == TokenType.OPERATOR) {
                this.parseExpr(it, tokens);
            }
        }
    }
    parseExpr(it, tokens) {
    }
}

export default Lexer;