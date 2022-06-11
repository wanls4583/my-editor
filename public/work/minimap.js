let cacheMap = {};
let cacheIds = [];
let renderedIdMap = {};
let dataObj = {};
let ctx = null;
let canvas = null;
let lines = null;
let singleLines = {};

function drawLine({ top, lineObj }) {
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
				setFillStyle(offCtx, dataObj.colors['editor.foreground']);
				if (token.scopeId) {
					let scope = dataObj.scopeIdMap[token.scopeId];
					if (scope.settings && scope.settings.foreground) {
						setFillStyle(offCtx, scope.settings.foreground);
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
			setFillStyle(offCtx, dataObj.colors['editor.foreground']);
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
	cacheCanvas();
}

// 定时更新
function render() {
	try {
		if (lines) {
			drawLines(lines);
			lines = null;
		} else {
			for (let key in singleLines) {
				drawLine(singleLines[key]);
			}
			singleLines = {};
		}
	} catch (e) {
		console.log(e);
	}
	requestAnimationFrame(() => {
		render();
	}, 15);
}

function setFillStyle(ctx, fillStyle) {
	if (ctx.fillStyle !== fillStyle) {
		ctx.fillStyle = fillStyle;
	}
}

function getLineObj({ lineId, lineObj }) {
	if (lineId) {
		lineObj = renderedIdMap[lineId].lineObj;
	} else {
		renderedIdMap[lineObj.lineId] = lineObj;
	}
	return lineObj;
}

function cacheLineObj(item) {
	if (item) {
		renderedIdMap[item.lineObj.lineId] = item;
	} else {
		renderedIdMap = {};
		lines.forEach(item => {
			renderedIdMap[item.lineObj.lineId] = item;
		});
	}
}

function cacheCanvas() {
	let obj = {};
	lines.forEach(item => {
		obj[item.lineObj.lineId] = cacheMap[item.lineObj.lineId];
	});
	cacheMap = obj;
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
	text = text.replace(/\t/g, '    ');
	return text;
}

render();

self.onmessage = function (e) {
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
			let line = data.data;
			let lineObj = getLineObj(line);
			line.lineObj = lineObj;
			singleLines[lineObj.lineId] = line;
			cacheLineObj(line);
			break;
		case 'render':
			lines = data.data;
			lines.map(item => {
				item.lineObj = getLineObj(item);
			});
			cacheLineObj();
			singleLines = {};
			break;
	}
};
