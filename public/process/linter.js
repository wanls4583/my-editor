const CSSLint = require('csslint').CSSLint;
const Stylelint = require('stylelint');

process.on('uncaughtException', (e) => {
    process.send('uncaughtException:', e);
});

process.on('message', (data) => {
    let language = data.language.toLowerCase();
    try {
        switch (language) {
            case 'css':
                lintCss(data);
                break;
            case 'scss':
            case 'less':
                lintScss(data);
                break;
        }
    } catch (e) {
        process.send({ error: e });
    }
});

function lintCss(data) {
    let messages = [];
    let results = CSSLint.verify(data.text);
    results.messages.forEach((item) => {
        messages.push({
            line: item.line,
            column: item.col - 1,
            reason: item.message,
        });
    });
    process.send({ parseId: data.parseId, results: messages });
}

function lintScss(data) {
    Stylelint.lint({ code: data.text, config: { rules: [] }, formatter: 'verbose' }).then(function (e) {
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
        process.send({ parseId: data.parseId, results: warnings });
    });
}
