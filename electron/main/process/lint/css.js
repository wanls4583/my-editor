const Stylelint = require('stylelint');

function lint(text, language) {
	const rules = {
		'property-no-unknown': false,
		'no-duplicate-selectors': false,
	};
	const extend = [];
	if (language === 'css') {
		rules['max-nesting-depth'] = 0;
		rules['no-invalid-double-slash-comments'] = true;
		// extend.push('stylelint-config-recommended');
	} else if (language === 'scss' || language === 'less') {
		extend.push('stylelint-config-recommended-scss');
		rules['no-descending-specificity'] = false;
		rules['selector-pseudo-class-no-unknown'] = false;
		rules['selector-pseudo-element-no-unknown'] = false;
	}
	return new Promise((resolve) => {
		Stylelint.lint({
			code: text,
			config: {
				rules: rules,
				extends: extend
			},
			formatter: 'verbose'
		}).then(function(e) {
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