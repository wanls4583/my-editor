/*
 * @Author: lisong
 * @Date: 2021-12-06 22:38:07
 * @Description: 
 */
export default function () {
    const constData = {
        PAIR_START: -1,
        PAIR_START_END: 0,
        PAIR_END: 1,
        FOLD_OPEN: 1,
        FOLD_CLOSE: -1,
        OP_ADD: 1,
        OP_DEL: -1,
        OP_REPLACE: 0,
        SENIOR_LEVEL: 999999
    }
    
    self.onmessage = function (e) {
        var data = e.data;
        if (data.type == 'run') {
            run(data);
        } else {
            clearTimeout(run.timer);
        }
    }

    function run(option) {
        let texts = option.texts;
        let pairRules = option.pairRules;
        let rules = option.rules;
        let index = 0;
        let pairTokensMap = {};
        pairRules.map((item) => {
            pairTokensMap[item.token] = true;
        });
        rules = rules.filter((item) => {
            return item.level == pairRules[0].level && !pairTokensMap[item.token];
        });
        _run();

        function _run() {
            var count = 0;
            let results = [];
            let start = index;
            while (index < texts.length && count < 1000) {
                let lineObj = texts[index];
                let tokens = [];
                let pairTokens = [];
                lineObj.text && rules.map((rule) => {
                    while (result = rule.reg.exec(lineObj.text)) {
                        tokens.push({
                            token: rule.token,
                            value: result[0],
                            level: rule.level,
                            start: result.index,
                            end: result.index + result[0].length
                        });
                    }
                    rule.reg.lastIndex = 0;
                });
                lineObj.text && pairRules.map((rule) => {
                    var isSame = rule.startReg.source === rule.endReg.source;
                    while (result = rule.startReg.exec(lineObj.text)) {
                        pairTokens.push({
                            token: rule.token,
                            value: result[0],
                            level: rule.level,
                            start: result.index,
                            end: result.index + result[0].length,
                            type: isSame ? constData.PAIR_START_END : constData.PAIR_START
                        });
                    }
                    if (!isSame) {
                        while (result = rule.endReg.exec(lineObj.text)) {
                            pairTokens.push({
                                token: rule.token,
                                value: result[0],
                                level: rule.level,
                                start: result.index,
                                end: result.index + result[0].length,
                                type: isSame ? constData.PAIR_START_END : constData.PAIR_END
                            });
                        }
                    }
                    rule.startReg.lastIndex = 0;
                    rule.endReg.lastIndex = 0;
                });
                results.push({
                    index: lineObj.index,
                    tokens: tokens,
                    pairTokens: pairTokens
                });
                index++;
            }
            self.postMessage(results);
            if (index < texts.length) {
                run.timer = setTimeout(() => {
                    _run();
                });
            }
        }
    }
}