/*
 * @Author: lisong
 * @Date: 2022-03-20 14:20:17
 * @Description: 
 */
export default function (hostname) {
    importScripts(`${hostname}/lib/jshint.js`);
    return {
        parse: function (text) {
            var option = {
                asi: true,
                boss: true,
                debug: true,
                elision: true,
                eqnull: true,
                evil: true,
                expr: true,
                funcscope: true,
                iterator: true,
                lastsemic: true,
                laxbreak: true,
                laxcomma: true,
                loopfunc: true,
                multistr: true,
                notypeof: true,
                noyield: true,
                proto: true,
                scripturl: true,
                sub: true,
                supernew: true,
                validthis: true,
                withstmt: true,
                esversion: 6
            }
            JSHINT(text, option);
            let result = JSHINT.data();
            let errors = result.errors && result.errors.map((item) => {
                return {
                    line: item.line,
                    column: item.character - 1,
                    reason: item.reason
                }
            });
            errors = errors && errors.filter((item) => {
                return item.code != 'W032';
            });
            console.log(result);
            return {
                errors: errors
            };
        }
    }
}