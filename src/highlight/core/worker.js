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
        DEFAULT: 'default'
    }

    let dataList = [];
    let removeList = [];
    let dataIndex = 0;
    let texts = null;
    let rules = null;
    let pairRules = null;
    let excludeRules = null;
    let index = 0;
    let max = 50000;

    // 主线程直接调用
    if (onceData) {
        return run(onceData);
    }

    self.onmessage = function (e) {
        let data = e.data;
        if (data.type == 'run') {
            dataList.push(data);
            dataIndex = dataList.length - 1;
            run(data);
        } else if (data.type == 'remove') {
            dataList.length && removeList.push(data);
        }
    };

    function run(option) {
        let childrenPairRules = [];
        texts = option.texts;
        rules = option.rules;
        max = option.max || 50000;
        pairRules = [];
        excludeRules = [];
        childrenPairRules = [];
        index = 0;
        _getPairRules(rules);
        return _run();
    }

    function _run() {
        let count = 0,
            results = [],
            result = null,
            startTime = Date.now();
        while (index < texts.length && count < max) {
            let lineObj = texts[index];
            let excludeTokens = {};
            let pairTokens = [];
            excludeTokens[constData.DEFAULT] = [];
            if (!_checkValid(lineObj.uuid)) {
                break;
            }
            if (!lineObj.text) {
                index++;
                count++;
                continue;
            }
            excludeRules.map((rule) => {
                while ((result = rule.regex.exec(lineObj.text)) && result[0].length) {
                    let key = rule.parentUuid || constData.DEFAULT;
                    excludeTokens[key] = excludeTokens[key] || [];
                    excludeTokens[key].push({
                        uuid: rule.uuid,
                        value: result[0],
                        level: rule.level,
                        start: result.index,
                        end: result.index + result[0].length
                    });
                    if (!rule.regex.global) {
                        break;
                    }
                }
                rule.regex.lastIndex = 0;
            });
            pairRules.map((rule) => {
                var isSame = rule.start.source === rule.next.source;
                if (rule.start instanceof RegExp) {
                    while ((result = rule.start.exec(lineObj.text)) && result[0].length) {
                        pairTokens.push({
                            uuid: rule.uuid,
                            value: result[0],
                            level: rule.level,
                            start: result.index,
                            end: result.index + result[0].length,
                            type: isSame ? constData.PAIR_START_END : constData.PAIR_START
                        });
                        if (!rule.start.global) {
                            break;
                        }
                    }
                    rule.start.lastIndex = 0;
                }
                if (!isSame) {
                    while ((result = rule.next.exec(lineObj.text)) && result[0].length) {
                        pairTokens.push({
                            uuid: rule.uuid,
                            value: result[0],
                            level: rule.level,
                            start: result.index,
                            end: result.index + result[0].length,
                            type: isSame ? constData.PAIR_START_END : constData.PAIR_END
                        });
                        if (!rule.next.global) {
                            break;
                        }
                    }
                    rule.next.lastIndex = 0;
                }
            });
            Object.values(excludeTokens).map((item) => {
                item.sort((a, b) => {
                    if (a.start - b.start == 0) {
                        return b.level - a.level;
                    }
                    return a.start - b.start;
                });
            });
            pairTokens.sort((a, b) => {
                if (a.start - b.start == 0) {
                    return b.level - a.level;
                }
                return a.start - b.start;
            });
            results.push({
                uuid: lineObj.uuid,
                excludeTokens: excludeTokens,
                pairTokens: pairTokens
            });
            index++;
            count++;
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
                dataList.splice(dataIndex, 1);
                !dataList.length && (removeList = []);
            }
        }
        // console.log(`worker run cost:${Date.now() - startTime}ms`);//120ms
    }

    function _getPairRules(rules) {
        let _pairRules = [];
        rules.map((item) => {
            if (item.start) {
                _pairRules.push(item);
                pairRules.push(item);
                if (item.childRule && item.childRule.rules) {
                    _getPairRules(item.childRule.rules);
                }
            }
        });
        _getExclueRules(rules, _pairRules);
    }

    function _getExclueRules(rules, pairRules) {
        let pairTokensMap = new Map();
        let minLevel = Infinity;
        pairRules.map((item) => {
            minLevel = minLevel > item.level ? item.level : minLevel;
            item.token && pairTokensMap.set(item.token, true);
        });
        rules = rules.filter((item) => {
            return item.level >= minLevel && !item.start && !pairTokensMap.has(item.token);
        });
        excludeRules = excludeRules.concat(rules);
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