const Stylelint = require('stylelint');

process.on('uncaughtException', (e) => {
    process.send('uncaughtException:', e);
});

process.on('message', (data) => {
    let language = data.language.toLowerCase();
    try {
        switch (language) {
            case 'css':
            case 'scss':
            case 'less':
                lintCss(data, language);
                break;
        }
    } catch (e) {
        process.send({ error: e });
    }
});

function lintCss(data, language) {
    _lintCss(data, language).then((warnings)=>{
        process.send({ parseId: data.parseId, results: warnings });
    });
}

function _lintCss(data, language) {
    const rules = {};
    const extend = [];
    if (language === 'css') {
        rules['max-nesting-depth'] = 0;
        extend.push('stylelint-config-css-modules');
    }
    return new Promise((resolve)=>{
        Stylelint.lint({ code: data.text, config: { rules: rules, extends: extend }, formatter: 'verbose' }).then(function (e) {
            let results = e.results;
            let warnings = [];
            results.forEach((item) => {
                if (item.errored) {
                    warnings.push(
                        ...item.warnings.map((warn) => {
                            return {
                                line: warn.line,
                                endLine: warn.endLine,
                                column: warn.column - 1,
                                endColumn: warn.endColumn,
                                reason: warn.text,
                            };
                        })
                    );
                }
            });
            resolve(warnings);
        });
    })
}

function lintHtml() {
    
}
