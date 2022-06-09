let cacheMap = {};
let renderedIdMap = {};
let dataObj = {};
let ctx = null;
let canvas = null;

function drawLine({ top, lineObj, lineId }) {
	if (lineId) {
		lineObj = renderedIdMap[lineId];
	} else {
		renderedIdMap[lineObj.lineId] = lineObj;
	}
	let cache = cacheMap[lineObj.lineId];
	let tokens = lineObj.tokens;
	let html = '';
	let charHight = dataObj.charHight;
	let marginLeft = 20 * dataObj.scale;
	ctx.clearRect(0, top, dataObj.width, charHight);
	html = lineObj.html || lineObj.text;
	if (cache && cache.html === html) {
		ctx.drawImage(cache.canvas, marginLeft, top);
	} else {
		let offscreen = new OffscreenCanvas(dataObj.width, charHight);
		let offCtx = offscreen.getContext('2d');
		offCtx.font = `bold ${16 * dataObj.scale}px Consolas`;
		offCtx.textBaseline = 'middle';
		if (tokens) {
			let left = marginLeft;
			for (let i = 0; i < tokens.length; i++) {
				let token = tokens[i];
				let text = lineObj.text.slice(token.startIndex, token.endIndex);
				text = getDrawText(text);
				offCtx.fillStyle = dataObj.colors['editor.foreground'];
				if (token.scopeId) {
					let scope = dataObj.scopeIdMap[token.scopeId];
					if (scope.settings && scope.settings.foreground) {
						offCtx.fillStyle = scope.settings.foreground;
					}
				}
				offCtx.fillText(text, left, charHight / 2);
				left += offCtx.measureText(text).width;
				// 退出无效渲染
				if (left > dataObj.width) {
					break;
				}
			}
		} else {
			offCtx.fillStyle = dataObj.colors['editor.foreground'];
			offCtx.fillText(getDrawText(lineObj.text), marginLeft, charHight / 2);
		}
		offscreen = offscreen.transferToImageBitmap();
		ctx.drawImage(offscreen, marginLeft, top);
		cacheMap[lineObj.lineId] = {
			html: html,
			canvas: offscreen,
		};
	}
}

function drawLines(lines) {
	ctx.clearRect(0, 0, dataObj.width, dataObj.height);
	lines.forEach(line => {
		this.drawLine(line);
	});
}

function setData(data) {
	let originDataObj = Object.assign({}, data);
	Object.assign(dataObj, data);
	canvas.width = dataObj.width || canvas.width;
	canvas.height = dataObj.height || canvas.height;
	for (let key in dataObj) {
		if (originDataObj[key] !== dataObj[key]) {
			// 清空缓存
			cacheMap = {};
			break;
		}
	}
}

function getDrawText(text) {
	// text = text.replace(/[a-zA-Z]/g, '▉ ');
	text = text.replace(/\t/g, '    ');
	return text;
}

onmessage = function (e) {
	let data = e.data;
	switch (data.event) {
		case 'init':
			canvas = data.data.canvas;
			ctx = canvas.getContext('2d');
			break;
		case 'init-data':
			setData(data.data);
			break;
		case 'render-line':
			drawLine(data.data);
			break;
		case 'render':
			drawLines(data.data);
			break;
	}
};
