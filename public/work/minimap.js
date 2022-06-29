let cacheMap = {};
let cacheIds = [];
let renderedIdMap = {};
let dataObj = {};
let canvas = null;
let leftDiffCanvas = null;
let rightDiffCanvas = null;
let ctx = null;
let leftDiffCtx = null;
let rightDiffCtx = null;
let lines = null;
let singleLines = null;
let diffRanges = null;
let allDiffRanges = null;
let slectedRanges = null;
let cursors = null;
let allCursors = null;
let cursorsImg = null;
let allCursorImg = null;
let canvasImgData = null;
let selectedImg = null;
let leftDiffCanvasImgData = null;
let rightDiffCanvasImgData = null;

function drawLine({ top, lineObj }) {
	let cache = cacheMap[lineObj.lineId];
	let tokens = lineObj.tokens;
	if (compairCache(cache, lineObj.text, lineObj.preRuleId)) {
		for (let i = 0; i < cache.imgData.data.length; i++) {
			canvasImgData.data[canvasImgData.index++] = cache.imgData.data[i];
		}
	} else {
		cacheMap[lineObj.lineId] = {
			text: lineObj.text,
			preRuleId: lineObj.preRuleId,
			imgData: _createImageData(),
		};
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
				_pushImgData({ buffers, text, color });
				// 退出无效渲染
				if (buffers[0].index >= dataWidth) {
					break;
				}
			}
		} else {
			_pushImgData({ buffers, text: getDrawText(lineObj.text), color });
		}
		buffers.forEach(buf => {
			buffer = buffer.concat(buf);
		});
		for (let i = 0; i < imgData.data.length; i++) {
			imgData.data[i] = buffer[i];
			canvasImgData.data[canvasImgData.index++] = imgData.data[i];
		}
		return imgData;
	}

	function _pushImgData({ buffers, text, color }) {
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
			if (buffers[0].index >= dataWidth) {
				break;
			}
		}
	}
}

function drawLines(lines) {
	canvasImgData.index = 0;
	ctx.clearRect(0, 0, dataObj.width, dataObj.height);
	lines.forEach(line => {
		this.drawLine(line);
	});
	for (let i = canvasImgData.index; i < canvasImgData.data.length; i++) {
		canvasImgData.data[i] = 0;
	}
	ctx.putImageData(canvasImgData, 0, 0);
	// 在现有的画布内容后面绘制新的图形
	ctx.globalCompositeOperation = 'destination-over';
	cursorsImg && ctx.drawImage(cursorsImg, 0, 0);
	selectedImg && ctx.drawImage(selectedImg, 0, 0);
	cacheCanvas();
}

function drawSingleLiens(singleLines) {
	ctx.clearRect(0, 0, dataObj.width, dataObj.height);
	for (let key in singleLines) {
		let obj = singleLines[key];
		canvasImgData.index = Math.round(dataObj.width * obj.top) * 4;
		drawLine(singleLines[key]);
	}
	ctx.putImageData(canvasImgData, 0, 0);
	ctx.globalCompositeOperation = 'destination-over';
	cursorsImg && ctx.drawImage(cursorsImg, 0, 0);
	selectedImg && ctx.drawImage(selectedImg, 0, 0);
}

function drawLeftDiff() {
	leftDiffCanvasImgData.data.fill(0);
	leftDiffCtx.clearRect(0, 0, dataObj.leftWidth, dataObj.height);
	if (diffRanges.length) {
		diffRanges.forEach(item => {
			let rgb = getDiffColor(item.type);
			if (item.type === 'D') {
				putRectPixl({ imgData: leftDiffCanvasImgData, left: 2, top: item.top, width: 4, height: item.height, rgb });
			} else {
				putRectPixl({ imgData: leftDiffCanvasImgData, left: 3, top: item.top, width: 2, height: item.height, rgb });
			}
		});
		leftDiffCtx.putImageData(leftDiffCanvasImgData, 0, 0);
	}
	diffRanges = null;
}

function drawRightDiff() {
	rightDiffCanvasImgData.data.fill(0);
	rightDiffCtx.clearRect(0, 0, dataObj.rightWidth, dataObj.height);
	if (allDiffRanges) {
		allDiffRanges.forEach(item => {
			let rgb = getDiffColor(item.type);
			putRectPixl({ imgData: rightDiffCanvasImgData, left: 0, top: item.top, width: 5, height: item.height, rgb });
		});
		rightDiffCtx.putImageData(rightDiffCanvasImgData, 0, 0);
		if (allCursorImg) {
			rightDiffCtx.drawImage(allCursorImg, 0, 0);
		}
	}
	allDiffRanges = null;
}

function drawCursor() {
	let rgb = getCursorColor();
	let cursorsImgData = new ImageData(dataObj.width, dataObj.height);
	for (let i = 0; i < cursors.length; i++) {
		putRectPixl({ imgData: cursorsImgData, left: 0, top: cursors[i], width: dataObj.width, height: dataObj.charHight, rgb, opacity: 1 });
	}
	createImageBitmap(cursorsImgData).then(img => {
		ctx.clearRect(0, 0, dataObj.width, dataObj.height);
		ctx.putImageData(canvasImgData, 0, 0);
		ctx.globalCompositeOperation = 'destination-over';
		selectedImg && ctx.drawImage(selectedImg, 0, 0);
		ctx.drawImage(img, 0, 0);
		cursorsImg = img;
	});
	cursors = null;
}

function drawSelectedBg() {
	let rgb = getRgb(dataObj.colors['editor.selectionBackground']);
	let slectedImgData = new ImageData(dataObj.width, dataObj.height);
	for (let i = 0; i < slectedRanges.length; i++) {
		let range = slectedRanges[i];
		let width = range.width || 2;
		if (range.left < dataObj.width) {
			width = range.left + width > dataObj.width ? dataObj.width - range.left : width;
			putRectPixl({ imgData: slectedImgData, left: range.left, top: range.top, width: width, height: dataObj.charHight, rgb, opacity: 1 });
		}
	}
	createImageBitmap(slectedImgData).then(img => {
		ctx.clearRect(0, 0, dataObj.width, dataObj.height);
		ctx.putImageData(canvasImgData, 0, 0);
		ctx.globalCompositeOperation = 'destination-over';
		ctx.drawImage(img, 0, 0);
		cursorsImg && ctx.drawImage(cursorsImg, 0, 0);
		selectedImg = img;
	});
	slectedRanges = null;
}

function drawAllCursor() {
	let rgb = getCursorColor(true);
	let allCursorsImgData = new ImageData(dataObj.width, dataObj.height);
	for (let i = 0; i < allCursors.length; i++) {
		putRectPixl({ imgData: allCursorsImgData, left: 0, top: allCursors[i], width: dataObj.width, height: dataObj.charHight, rgb });
	}
	createImageBitmap(allCursorsImgData).then(img => {
		rightDiffCtx.clearRect(0, 0, dataObj.rightWidth, dataObj.height);
		rightDiffCtx.putImageData(rightDiffCanvasImgData, 0, 0);
		rightDiffCtx.drawImage(img, 0, 0);
		allCursorImg = img;
	});
	allCursors = null;
}

function putRectPixl({ imgData, left, top, width, height, rgb, opacity }) {
	let index = (imgData.width * top + left) * 4;
	let originIndex = index;
	opacity = opacity || 1;
	opacity = Math.floor(opacity * 255);
	for (let h = 0; h < height; h++) {
		for (let w = 0; w < width; w++) {
			_putPixl(index, rgb);
			index += 4;
		}
		originIndex += imgData.width * 4;
		index = originIndex;
	}

	function _putPixl(index, rgb) {
		if (index < imgData.data.length) {
			imgData.data[index] = rgb[0];
			imgData.data[index + 1] = rgb[1];
			imgData.data[index + 2] = rgb[2];
			imgData.data[index + 3] = opacity;
		}
	}
}

// 定时更新
function render() {
	try {
		if (dataObj.width && dataObj.height && dataObj.charHight && ctx) {
			if (lines) {
				drawLines(lines);
				lines = null;
			} else if (singleLines) {
				drawSingleLiens(singleLines);
				singleLines = null;
			}
			if (cursors) {
				drawCursor();
			}
			if (allCursors) {
				drawAllCursor();
			}
			if (slectedRanges) {
				drawSelectedBg();
			}
			if (diffRanges) {
				drawLeftDiff();
			}
			if (allDiffRanges) {
				drawRightDiff();
			}
		}
	} catch (e) {
		console.log(e);
	}
	clearTimeout(render.timer);
	render.timer = setTimeout(() => {
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

function initData(data) {
	if (data.canvas) {
		canvas = data.canvas;
		ctx = canvas.getContext('2d');
	}
	if (data.leftDiffCanvas) {
		leftDiffCanvas = data.leftDiffCanvas;
		leftDiffCtx = leftDiffCanvas.getContext('2d');
	}
	if (data.rightDiffCanvas) {
		rightDiffCanvas = data.rightDiffCanvas;
		rightDiffCtx = rightDiffCanvas.getContext('2d');
	}
}

function setData(data) {
	let sizeChange = false;
	if (data.height !== undefined && data.height !== dataObj.height) {
		canvas.height = data.height;
		leftDiffCanvas.height = data.height;
		rightDiffCanvas.height = data.height;
		sizeChange = true;
	}
	if (data.width !== undefined && data.width !== dataObj.width) {
		canvas.width = data.width;
		sizeChange = true;
	}
	if (data.space !== undefined && data.space !== dataObj.space) {
		sizeChange = true;
	}
	if (data.colors || data.scopeIdMap) {
		sizeChange = true;
	}
	if (data.leftWidth !== undefined && data.leftWidth !== dataObj.leftWidth) {
		leftDiffCanvas.width = data.leftWidth;
	}
	if (data.rightWidth !== undefined && data.rightWidth !== dataObj.rightWidth) {
		rightDiffCanvas.width = data.rightWidth;
	}
	Object.assign(dataObj, data);
	sizeChange && _emptyCode();

	function _emptyCode() {
		// 清空数据
		cacheMap = {};
		lines = null;
		singleLines = null;
		if (dataObj.width && dataObj.height) {
			canvasImgData = new ImageData(dataObj.width, dataObj.height);
		}
		if (dataObj.leftWidth && dataObj.height) {
			leftDiffCanvasImgData = new ImageData(dataObj.leftWidth, dataObj.height);
		}
		if (dataObj.rightWidth && dataObj.height) {
			rightDiffCanvasImgData = new ImageData(dataObj.rightWidth, dataObj.height);
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
	text = text.replace(/\t/g, dataObj.space);
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

function getDiffColor(type) {
	let color = dataObj.colors['editor.foreground'];
	switch (type) {
		case 'A':
			color = dataObj.colors['gitDecoration.addedResourceForeground'];
			break;
		case 'M':
			color = dataObj.colors['gitDecoration.modifiedResourceForeground'];
			break;
		case 'D':
			color = dataObj.colors['gitDecoration.deletedResourceForeground'];
			break;
	}
	return getRgb(color);
}

function getCursorColor(useTextColor) {
	let rgb = dataObj.colors['editor.lineHighlightBackground'];
	if (useTextColor) {
		rgb = dataObj.colors['editor.foreground'];
	}
	if (rgb !== 'transparent') {
		rgb = getRgb(rgb);
	} else {
		rgb = getRgb(dataObj.colors['editor.lineHighlightBorder']);
	}
	return rgb;
}

self.onmessage = function (e) {
	let data = e.data;
	let event = data.event;
	data = data.data;
	switch (event) {
		case 'init':
			this.initData(data);
			render();
			break;
		case 'set-data':
			setData(data);
			break;
		case 'render-line':
			let line = data;
			let lineObj = getLineObj(line);
			line.lineObj = lineObj;
			singleLines = singleLines || {};
			singleLines[lineObj.lineId] = line;
			cacheLineObj(line);
			break;
		case 'render':
			lines = data;
			lines.map(item => {
				item.lineObj = getLineObj(item);
			});
			cacheLineObj();
			singleLines = null;
			break;
		case 'render-diff':
			diffRanges = data;
			break;
		case 'render-diff-all':
			allDiffRanges = data;
			break;
		case 'render-cursor':
			cursors = data;
			break;
		case 'render-cursor-all':
			allCursors = data;
			break;
		case 'render-selected-bg':
			slectedRanges = data;
			break;
	}
};
