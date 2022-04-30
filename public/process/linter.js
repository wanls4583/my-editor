const stylelint = require('stylelint');

process.on('uncaughtException', (e) => {
    process.send('uncaughtException:', e);
});

process.on('message', (data) => {
    let language = data.language.toLowerCase();
    switch (language) {
        case 'css':
        case 'scss':
        case 'less':
            lintCss(data);
            break;
    }
});

function lintCss(data) {
    stylelint.lint({ code: data.text, config: { rules: [] }, formatter: 'verbose' }).then(function (e) {
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
