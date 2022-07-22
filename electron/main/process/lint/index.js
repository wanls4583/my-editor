const Css = require('./css');
const Html = require('./html');
const JavaScript = require('./javascript');

process.on('uncaughtException', (e) => {
    console.log(e);
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
            case 'vue':
                lintHtml(data, language);
                break;
            case 'javascript':
                lintJs(data, language);
                break;
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

function lintJs(data, language) {
    JavaScript.lint(data.text, language).then((errors) => {
        process.send({ parseId: data.parseId, results: errors });
    });
}
