/*
 * @Author: lisong
 * @Date: 2021-12-06 22:38:07
 * @Description: 
 */
export default function (onceData) {
    const constData = {
        PAIR_START: -1,
        PAIR_START_END: 0,
        PAIR_END: 1,
        FOLD_OPEN: 1,
        FOLD_CLOSE: -1,
    }

    let dataList = [];
    let removeList = [];

    // 主线程直接调用
    if (onceData) {
        return run(onceData);
    }

    self.onmessage = function (e) {
        let data = e.data;
        if (data.type == 'run') {
            dataList.push(data);
            data.index = dataList.length - 1;
            run(data);
        } else if (data.type == 'remove') {
            removeList.push(data);
        }
    };

    function run(option) {
        let texts = option.texts;
        let pairRules = option.pairRules;
        let rules = option.rules;
        let index = 0;
        let pairTokensMap = {};
        let max = option.max || 10000;
        pairRules.map((item) => {
            pairTokensMap[item.token] = true;
        });
        rules = rules.filter((item) => {
            return item.level == pairRules[0].level && !pairTokensMap[item.token];
        });
        return _run();

        function _run() {
            var count = 0;
            let results = [];
            let result = null;
            while (index < texts.length && count < max) {
                let lineObj = texts[index];
                let excludeTokens = [];
                let pairTokens = [];
                if (!_checkValid(lineObj.uuid)) {
                    break;
                }
                lineObj.text && rules.map((rule) => {
                    while (result = rule.regex.exec(lineObj.text)) {
                        excludeTokens.push({
                            token: rule.token,
                            value: result[0],
                            level: rule.level,
                            start: result.index,
                            end: result.index + result[0].length
                        });
                    }
                    rule.regex.lastIndex = 0;
                });
                lineObj.text && pairRules.map((rule) => {
                    var isSame = rule.startRegex.source === rule.endRegex.source;
                    while (result = rule.startRegex.exec(lineObj.text)) {
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
                        while (result = rule.endRegex.exec(lineObj.text)) {
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
                    rule.startRegex.lastIndex = 0;
                    rule.endRegex.lastIndex = 0;
                });
                excludeTokens.sort((a, b) => {
                    return a.start - b.start;
                });
                pairTokens.sort((a, b) => {
                    return a.start - b.start;
                });
                results.push({
                    uuid: lineObj.uuid,
                    excludeTokens: excludeTokens,
                    pairTokens: pairTokens
                });
                index++;
            }
            if (onceData) { // 主线程直接调用
                return results;
            } else { // 子线程调用
                self.postMessage(results);
                if (index < texts.length) {
                    option.timer = setTimeout(() => {
                        _run();
                    }, 0);
                } else {
                    dataList.splice(option.index, 1);
                }
            }
        }

        // 检查uuid对应的行对象是否已被删除或被替换
        function _checkValid(uuid) {
            for (let i = 0; i < removeList.length; i++) {
                if (removeList[i].uuid == uuid) {
                    index += removeList[i].length;
                    removeList.splice(i, 1);
                    return false;
                }
            }
            return true;
        }
    }
}