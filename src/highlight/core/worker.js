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
    let uuid = 1;

    // 主线程直接调用
    if (onceData) {
        return run(onceData);
    }

    self.onmessage = function (e) {
        let data = e.data;
        if (data.type == 'run') {
            dataList.push(data);
            data.uuid = uuid++;
            run(data);
        } else if (data.type == 'remove') {
            dataList.length && removeList.push(data);
        }
    };

    function run(option) {
        let texts = option.texts;
        let rules = option.rules;
        let max = option.max || 1000;
        let pairRules = [];
        let excludeRules = [];
        let index = 0;
        _getPairRules(rules);
        return _run();

        function _run() {
            let count = 0,
                results = [],
                result = null,
                startTime = Date.now();
            while (index < texts.length && count < max) {
                let lineObj = texts[index];
                let excludeTokens = {};
                let pairTokens = [];
                let resultMap = new Map(); //缓存相同的正则
                excludeTokens[constData.DEFAULT] = [];
                if (!_checkValid(lineObj.uuid)) {
                    break;
                }
                excludeRules.map((rule) => {
                    let key = rule.parentUuid || constData.DEFAULT;
                    let token = null;
                    let tokens = [];
                    excludeTokens[key] = excludeTokens[key] || [];
                    if (resultMap.has(rule.regex.source)) {
                        tokens = resultMap.get(rule.regex.source);
                        tokens.map((token) => {
                            token = Object.assign({}, token);
                            token.uuid = rule.uuid;
                            token.token = rule.token;
                            token.level = rule.level;
                            excludeTokens[key].push(token);
                        });
                    } else {
                        while (result = rule.regex.exec(lineObj.text)) {
                            token = {
                                uuid: rule.uuid,
                                token: rule.token,
                                level: rule.level,
                                value: result[0],
                                start: result.index,
                                end: result.index + result[0].length
                            };
                            tokens.push(token);
                            excludeTokens[key].push(token);
                            if (!result[0].length || !rule.regex.global) {
                                break;
                            }
                        }
                        resultMap.set(rule.regex.source, tokens);
                        rule.regex.lastIndex = 0;
                    }
                });
                pairRules.map((rule) => {
                    let isSame = rule.start.source === rule.next.source;
                    if (rule.start instanceof RegExp) {
                        let pairToken = null;
                        let tokens = [];
                        if (resultMap.has(rule.start.source)) {
                            tokens = resultMap.get(rule.start.source);
                            tokens.map((pairToken) => {
                                pairToken = Object.assign({}, pairToken);
                                pairToken.uuid = rule.uuid;
                                pairToken.token = rule.token;
                                pairToken.level = rule.level;
                                pairToken.type = isSame ? constData.PAIR_START_END : constData.PAIR_START;
                                pairTokens.push(pairToken);
                            });
                        } else {
                            while (result = rule.start.exec(lineObj.text)) {
                                pairToken = {
                                    uuid: rule.uuid,
                                    token: rule.token,
                                    level: rule.level,
                                    value: result[0],
                                    start: result.index,
                                    end: result.index + result[0].length,
                                    type: isSame ? constData.PAIR_START_END : constData.PAIR_START
                                };
                                tokens.push(pairToken);
                                pairTokens.push(pairToken);
                                if (!result[0].length || !rule.start.global) {
                                    break;
                                }
                            }
                            resultMap.set(rule.start.source, tokens);
                            rule.start.lastIndex = 0;
                        }
                    }
                    if (!isSame && rule.next instanceof RegExp) {
                        let pairToken = null;
                        let tokens = [];
                        if (resultMap.has(rule.next.source)) {
                            tokens = resultMap.get(rule.next.source);
                            tokens.map((pairToken) => {
                                pairToken = Object.assign({}, pairToken);
                                pairToken.uuid = rule.uuid;
                                pairToken.token = rule.token;
                                pairToken.level = rule.level;
                                pairToken.type = isSame ? constData.PAIR_START_END : constData.PAIR_END;
                                pairTokens.push(pairToken);
                            });
                        } else {
                            while (result = rule.next.exec(lineObj.text)) {
                                pairToken = {
                                    uuid: rule.uuid,
                                    token: rule.token,
                                    level: rule.level,
                                    value: result[0],
                                    start: result.index,
                                    end: result.index + result[0].length,
                                    type: isSame ? constData.PAIR_START_END : constData.PAIR_END
                                };
                                tokens.push(pairToken);
                                pairTokens.push(pairToken);
                                if (!result[0].length || !rule.next.global) {
                                    break;
                                }
                            }
                            resultMap.set(rule.next.source, tokens);
                            rule.next.lastIndex = 0;
                        }
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
                    dataList = dataList.filter((item) => {
                        return item.uuid != option.uuid;
                    });
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
}