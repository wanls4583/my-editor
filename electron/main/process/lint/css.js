const Stylelint = require('stylelint');

function lint(text, language) {
    const rules = {};
    const extend = [];
    if (language === 'css') {
        rules['max-nesting-depth'] = 0;
        extend.push('stylelint-config-css-modules');
    }
    return new Promise((resolve) => {
        Stylelint.lint({ code: text, config: { rules: rules, extends: extend }, formatter: 'verbose' }).then(function (e) {
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
    });
}

module.exports = {
    lint: lint,
};
