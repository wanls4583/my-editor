let cacheMap = {};
let cacheIds = [];
let renderedIdMap = {};
let dataObj = {};
let ctx = null;
let canvas = null;
let lines = null;
let singleLines = {};
let emptyPixl = [0, 0, 0, 0];

function drawLine({ top, lineObj }, targetImaData) {
	let cache = cacheMap[lineObj.lineId];
	let tokens = lineObj.tokens;
	let marginLeft = 100 * dataObj.scale;
	if (compairCache(cache, lineObj.text, lineObj.preRuleId)) {
		if (targetImaData) {
			for (let i = 0; i < cache.imgData.data.length; i++) {
				targetImaData.data[targetImaData.index++] = cache.imgData.data[i];
			}
		}
	} else {
		cacheMap[lineObj.lineId] = {
			text: lineObj.text,
			preRuleId: lineObj.preRuleId,
			imgData: _createImageData(),
		};
	}
	if (!targetImaData) {
		let imgData = cacheMap[lineObj.lineId].imgData;
		ctx.clearRect(0, top, dataObj.width, dataObj.charHight);
		ctx.putImageData(imgData, marginLeft, top);
	}

	function _createImageData() {
		let dataWidth = dataObj.width * 4;
		let color = getRgb(dataObj.colors['editor.foreground']);
		let buffers = new Array(dataObj.charHight).fill(0);
		let buffer = [];
		let imgData = new ImageData(dataObj.width, dataObj.charHight);
		buffers = buffers.map(() => {
			let line = new Array(dataWidth).fill(0);
			line.index = 0;
			return line;
		});
		if (tokens) {
			// 减少token数量
			tokens = getDrawTokens(tokens);
			for (let i = 0; i < tokens.length; i++) {
				let token = tokens[i];
				let text = lineObj.text.slice(token.startIndex, token.endIndex);
				text = getDrawText(text);
				color = getRgb(dataObj.colors['editor.foreground']);
				if (token.scopeId) {
					let scope = dataObj.scopeIdMap[token.scopeId];
					if (scope && scope.settings && scope.settings.foreground) {
						color = getRgb(scope.settings.foreground);
					}
				}
				_pushImgData(buffers, text, color);
				// 退出无效渲染
				if (buffers[0].index >= dataWidth - 1) {
					break;
				}
			}
		} else {
			_pushImgData(buffers, getDrawText(lineObj.text), color);
		}
		buffers.forEach(buf => {
			buffer = buffer.concat(buf);
		});
		for (let i = 0; i < imgData.data.length; i++) {
			imgData.data[i] = buffer[i];
			if (targetImaData) {
				targetImaData.data[targetImaData.index++] = imgData.data[i];
			}
		}
		return imgData;
	}

	function _pushImgData(buffers, text, color) {
		let dataWidth = dataObj.width * 4;
		for (let i = 0; i < text.length; i++) {
			if (text[i] != ' ') {
				let imgData = getCharImgData(text[i], color);
				for (let h = 0; h < imgData.height; h++) {
					for (let w = 0; w < imgData.width; w++) {
						let pixl = imgData[h][w];
						let buffer = buffers[h];
						if (buffer.index <= dataWidth - 4) {
							buffer[buffer.index] = pixl[0];
							buffer[buffer.index + 1] = pixl[1];
							buffer[buffer.index + 2] = pixl[2];
							buffer[buffer.index + 3] = pixl[3];
							buffer.index += 4;
						}
					}
				}
			} else {
				// 空格占一个像素点
				buffers.forEach(buffer => {
					buffer.index += 4;
				});
			}
			if (buffers[0].index >= dataWidth - 1) {
				break;
			}
		}
	}
}

function drawLines(lines) {
	let marginLeft = 100 * dataObj.scale;
	let imgData = new ImageData(dataObj.width, dataObj.height);
	imgData.index = 0;
	ctx.clearRect(0, 0, dataObj.width, dataObj.height);
	lines.forEach(line => {
		this.drawLine(line, imgData);
	});
	ctx.putImageData(imgData, marginLeft, 0);
	cacheCanvas();
}

// 定时更新
function render() {
	try {
		if (dataObj.width && dataObj.height && dataObj.charHight) {
			if (lines) {
				drawLines(lines);
				lines = null;
			} else {
				for (let key in singleLines) {
					drawLine(singleLines[key]);
				}
				singleLines = {};
			}
		}
	} catch (e) {
		console.log(e);
	}
	setTimeout(() => {
		render();
	}, 15);
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

function compairCache(cache, text, preRuleId) {
	if (cache && cache.text === text && cache.preRuleId === preRuleId) {
		return true;
	}
}

function setData(data) {
	let originDataObj = Object.assign({}, data);
	Object.assign(dataObj, data);
	canvas.width = dataObj.width || canvas.width;
	canvas.height = dataObj.height || canvas.height;
	for (let key in dataObj) {
		if (originDataObj[key] !== dataObj[key]) {
			// 清空数据
			cacheMap = {};
			lines = null;
			singleLines = {};
			break;
		}
	}
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

function getDrawText(text) {
	text = text.replace(/\t/g, '    ');
	return text;
}

function getDrawTokens(tokens) {
	let htmlTokens = [];
	let preToken = null;
	for (let i = 0; i < tokens.length; i++) {
		let item = tokens[i];
		let scopeId = item.scopeId;
		if (preToken && _compair(preToken.scopeId, scopeId)) {
			preToken.endIndex = item.endIndex;
			continue;
		}
		preToken = {
			scopeId: scopeId,
			startIndex: item.startIndex,
			endIndex: item.endIndex,
		};
		htmlTokens.push(preToken);
	}
	return htmlTokens;

	function _compair(scope1, scope2) {
		scope1 = dataObj.scopeIdMap[scope1];
		scope2 = dataObj.scopeIdMap[scope2];
		scope1 = (scope1 && scope1.settingsStr) || '';
		scope2 = (scope2 && scope2.settingsStr) || '';
		return scope1 === scope2;
	}
}

function getCharImgData(char, rgb) {
	let data = getCharImgData[char];
	if (!getCharImgData[char]) {
		let offscreen = new OffscreenCanvas(dataObj.charHight, dataObj.charHight);
		let offCtx = offscreen.getContext('2d');
		let width = 1;
		offCtx.font = `bold ${dataObj.charHight}px Consolas`;
		offCtx.textBaseline = 'top';
		offCtx.fillText(char, 0, 0);
		data = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
		// 获取字符真实宽度
		// for (let h = 0; h < dataObj.charHight; h++) {
		// 	for (let w = 0; w < dataObj.charHight; w++) {
		// 		let index = (h * dataObj.charHight + w) * 4;
		// 		if (data[index + 3] !== 0) {
		// 			width = Math.max(width, w + 1);
		// 		}
		// 	}
		// }
		// 截取字符像素
		let arr = [];
		for (let h = 0; h < dataObj.charHight; h++) {
			let line = new Array(width).fill(0).map(() => {
				return [0, 0, 0, 0];
			});
			for (let w = 0; w < width; w++) {
				let index = (h * dataObj.charHight + w) * 4;
				if (data[index + 3] !== 0) {
					// 增加40%的不透明度
					data[index + 3] += Math.floor(255 * 0.4);
					data[index + 3] = data[index + 3] > 255 ? 255 : data[index + 3];
					line[w] = [...data.slice(index, index + 4)];
				}
			}
			arr.push(line);
		}
		data = arr;
		data.width = width;
		data.height = dataObj.charHight;
		getCharImgData[char] = data;
	}
	for (let h = 0; h < data.height; h++) {
		for (let w = 0; w < data.width; w++) {
			let pixl = data[h][w];
			pixl[0] = rgb[0];
			pixl[1] = rgb[1];
			pixl[2] = rgb[2];
		}
	}
	return data;
}

function getRgb(color) {
	if (!getRgb[color]) {
		let rgb = [];
		for (let i = 1, c = 0; i <= color.length - 2 && c < 3; i += 2, c++) {
			rgb.push(Number('0x' + color[i] + color[i + 1]));
		}
		getRgb[color] = rgb;
	}
	return getRgb[color];
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
