const Linter = require('eslint').Linter;
const linter = new Linter();

function lint(text, language) {
    const rules = {};
    return new Promise((resolve) => {
        let arr = linter.verify(text, { rules: rules });
        let results = [];
        arr.forEach((item) => {
            results.push({
                line: item.line,
                column: item.column - 1,
                reason: item.message,
            });
        });
        resolve(results);
    });
}

module.exports = {
    lint: lint,
};
