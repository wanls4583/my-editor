const Css = require('./css');
const Html = require('./html');

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
            case 'html':
                lintHtml(data, language);
        }
    } catch (e) {
        process.send({ error: e });
    }
});

function lintCss(data, language) {
    Css.lint(data.text, language).then((errors) => {
        process.send({ parseId: data.parseId, results: errors });
    });
}

function lintHtml(data, language) {
    Html.lint(data.text, language).then((errors) => {
        process.send({ parseId: data.parseId, results: errors });
    });
}
