/*
 * @Author: lisong
 * @Date: 2022-01-05 10:11:25
 * @Description: 
 */
import Util from '@/common/util';
import PeekIterator from '@/common/PeekIterator';
import TokenType from './TokenType';
import Token from './Token';
import LintError from './LintError';
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
        let lintError = null;
        let lintTokens = [];
        let lintStates = [];
        let it = new PeekIterator(this.htmls[nowLine - 1].text);
        if (nowLine > 1 && this.htmls[nowLine - 2].lintStates) {
            lintStates = this.htmls[nowLine - 2].lintStates.slice(0);
        }
        while (it.hasNext()) {
            let token = null;
            let c = it.next();
            let lookahead = it.peek();

            if (c == ' ' || c == '\t') {
                continue;
            }

            if (lintStates.length) { //有未完成的token提取
                let state = lintStates.peek();
                if (state == '/*') { //多行注释
                    if (c != '*' || lookahead != '/') {
                        continue;
                    }
                } else if (state == '\'' || state == '"') { //多行字符串
                    if (c != state) {
                        if (!it.hasNext() && c != '\\') {
                            lintStates.pop();
                            lintError = new LintError(`Unexpected error in column ${it.index()}`)
                        }
                        continue;
                    }
                    lintTokens.push(new Token(TokenType.STRING, state));
                } else if (state == '`') { //模板字符串
                    if (c != state) {
                        continue;
                    }
                    lintTokens.push(new Token(TokenType.STRING, state));
                }
                lintStates.pop();
                continue;
            }

            // 提取注释的程序
            if (c == "/") {
                if (lookahead == "/") { //单行注释
                    break;
                } else if (lookahead == "*") { //多行注释
                    lintStates.push('/*');
                    continue;
                }
            }

            // 提取模板字符串
            if (c == '\'' || c == '"' || c == '`') {
                lintStates.push(c);
                continue;
            }

            // 括号
            if (c == "{" || c == "}" || c == "(" || c == ")") {
                lintTokens.push(new Token(TokenType.BRACKET, c));
                continue;
            }

            // 变量
            if (AlphabetHelper.isLetter(c)) {
                it.putBack();
                token = Token.makeVarOrKeyword(it);
                if (token instanceof LintError) {
                    lintError = token;
                } else {
                    lintTokens.push(token);
                }
                continue;
            }

            // 数字
            if (AlphabetHelper.isNumber(c)) {
                it.putBack();
                token = Token.makeNumber(it);
                if (token instanceof LintError) {
                    lintError = token;
                } else {
                    lintTokens.push(token);
                }
                continue;
            }

            if ((c == '-' || c == '+') && AlphabetHelper.isNumber(lookahead)) {
                let preToken = lintTokens.peek();
                if (!preToken || !lastToken.isValue()) {
                    it.putBack();
                    token = Token.makeNumber(it);
                    if (token instanceof LintError) {
                        lintError = token;
                    } else {
                        lintTokens.push(token);
                    }
                    continue;
                }
            }

            if (AlphabetHelper.isOperator(c)) {
                it.putBack();
                token = Token.makeOp(it);
                if (token instanceof LintError) {
                    lintError = token;
                } else {
                    lintTokens.push(token);
                }
                continue;
            }

        }
        return {
            lintStates: lintStates,
            lintTokens: lintTokens,
            lintError: lintError,
        }
    }
}

export default Lexer;