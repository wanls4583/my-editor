/*
 * @Author: lisong
 * @Date: 2022-03-20 16:44:03
 * @Description: 
 */
export default function () {
    importScripts("http://localhost:8080/lib/csslint.js");
    return {
        parse: function (text) {
            var option = {}
            let result = CSSLint.verify(text, option);
            let errors = result.messages && result.messages.map((item) => {
                return {
                    line: item.line,
                    column: item.col,
                    reason: item.message
                }
            });
            console.log(result);
            return {
                errors: errors
            };
        }
    }
}