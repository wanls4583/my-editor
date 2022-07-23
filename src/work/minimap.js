export default function () {
	class Minimap {
		constructor() {
			this.cacheMap = {};
			this.getCharImgDataCache = {};
			this.getRgbCache = {};
			this.renderedIdMap = {};
			this.dataObj = {};
			this.canvas = null;
			this.overlayCanvas = null;
			this.leftCanvas = null;
			this.rightCanvas = null;
			this.ctx = null;
			this.overlayCtx = null;
			this.leftDiffCtx = null;
			this.rightCtx = null;
			this.lines = null;
			this._lines = [];
			this.singleLines = null;
			this.diffRanges = null;
			this.allDiffRanges = null;
			this.selectedData = null;
			this.allSelectedData = null;
			this.cursors = null;
			this.allCursors = null;
			this.canvasImgData = null;
			this.overlayImgData = null;
			this.cursorsImgData = null;
			this.selectedImgData = null;
			this.leftDiffCanvasImgData = null;
			this.rightImgData = null;
			this.allCursorImgData = null;
			this.allSelectedImgData = null;
			this.allDiffImgData = null;
		}
		drawLine({ lineObj }) {
			let cache = this.cacheMap[lineObj.lineId];
			let tokens = lineObj.tokens;
			if (this.compairCache(cache, lineObj.text, lineObj.preRuleId)) {
				for (let i = 0; i < cache.imgData.data.length; i++) {
					this.canvasImgData.data[this.canvasImgData.index++] = cache.imgData.data[i];
				}
			} else {
				this.cacheMap[lineObj.lineId] = {
					text: lineObj.text,
					preRuleId: lineObj.preRuleId,
					imgData: _createImageData.call(this)
				};
			}

			function _createImageData() {
				let dataWidth = this.dataObj.width * 4;
				let color = this.getRgb(this.dataObj.colors['editor.foreground']);
				let buffers = new Array(this.dataObj.charHight).fill(0);
				let buffer = [];
				let imgData = new ImageData(this.dataObj.width, this.dataObj.charHight);
				buffers = buffers.map(() => {
					let line = new Array(dataWidth).fill(0);
					line.index = 0;
					return line;
				});
				if (tokens) {
					// 减少token数量
					tokens = this.getDrawTokens(tokens);
					for (let i = 0; i < tokens.length; i++) {
						let token = tokens[i];
						let text = lineObj.text.slice(token.startIndex, token.endIndex);
						text = this.getDrawText(text);
						color = this.getRgb(this.dataObj.colors['editor.foreground']);
						if (token.scopeId) {
							let scope = this.dataObj.scopeIdMap[token.scopeId];
							if (scope && scope.settings && scope.settings.foreground) {
								color = this.getRgb(scope.settings.foreground);
							}
						}
						_pushImgData.call(this, { buffers, text, color });
						// 退出无效渲染
						if (buffers[0].index >= dataWidth) {
							break;
						}
					}
				} else {
					_pushImgData.call(this, { buffers, text: this.getDrawText(lineObj.text), color });
				}
				buffers.forEach(buf => {
					buffer = buffer.concat(buf);
				});
				for (let i = 0; i < imgData.data.length; i++) {
					imgData.data[i] = buffer[i];
					this.canvasImgData.data[this.canvasImgData.index++] = imgData.data[i];
				}
				return imgData;
			}

			function _pushImgData({ buffers, text, color }) {
				let dataWidth = this.dataObj.width * 4;
				for (let i = 0; i < text.length; i++) {
					if (text[i] != ' ') {
						let imgData = this.getCharImgData(text[i], color);
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
		drawLines(lines) {
			this.canvasImgData.index = 0;
			this.canvasImgData.data.fill(0);
			this.ctx.clearRect(0, 0, this.dataObj.width, this.dataObj.height);
			lines.forEach(line => {
				this.drawLine(line);
			});
			this.ctx.putImageData(this.canvasImgData, 0, 0);
			// 在现有的画布内容后面绘制新的图形
			// this.ctx.globalCompositeOperation = 'destination-over';
			this.cacheCanvas();
		}
		drawSingleLiens(singleLines) {
			this.ctx.clearRect(0, 0, this.dataObj.width, this.dataObj.height);
			for (let key in singleLines) {
				let obj = singleLines[key];
				this.canvasImgData.index = Math.round(this.dataObj.width * obj.top) * 4;
				this.drawLine(singleLines[key]);
			}
			this.ctx.putImageData(this.canvasImgData, 0, 0);
		}
		drawDiff() {
			this.leftDiffCanvasImgData.data.fill(0);
			this.leftDiffCtx.clearRect(0, 0, this.dataObj.leftWidth, this.dataObj.height);
			if (this.diffRanges.length) {
				this.diffRanges.forEach(item => {
					let rgb = this.getDiffColor(item.type);
					if (item.type === 'D') {
						this.putRectPixl({ imgData: this.leftDiffCanvasImgData, left: 2, top: item.top, width: 4, height: item.height, rgb });
					} else {
						this.putRectPixl({ imgData: this.leftDiffCanvasImgData, left: 3, top: item.top, width: 2, height: item.height, rgb });
					}
				});
				this.leftDiffCtx.putImageData(this.leftDiffCanvasImgData, 0, 0);
			}
			this.diffRanges = null;
		}
		drawSelectedBg() {
			let results = this.selectedData.results.map(item => {
				return {
					rgb: this.getRgb(this.dataObj.colors['minimap.selectionHighlight']),
					top: item
				};
			});
			let fResults = this.selectedData.fResults.map(item => {
				return {
					rgb: this.getRgb(this.dataObj.colors['minimap.findMatchHighlight']),
					top: item
				};
			});
			this.selectedImgData.data.fill(0);
			results = results.concat(fResults);
			if (results.length) {
				for (let i = 0; i < results.length; i++) {
					let item = results[i];
					this.putRectPixl({ imgData: this.selectedImgData, left: 0, top: item.top, width: this.dataObj.width, height: this.dataObj.charHight, rgb: item.rgb });
				}
				this.setOverLayImgData();
				this.overlayCtx.putImageData(this.overlayImgData, 0, 0);
			} else {
				this.overlayCtx.putImageData(this.cursorsImgData, 0, 0);
			}
			this.selectedData = null;
		}
		drawCursor() {
			let rgb = this.getCursorColor();
			if (rgb[3]) {
				rgb = rgb.slice();
				rgb[3] += Math.floor(255 * 0.4);
				rgb[3] = rgb[3] > 255 ? 255 : rgb[3];
			}
			this.cursorsImgData.data.fill(0);
			if (this.cursors.length) {
				for (let i = 0; i < this.cursors.length; i++) {
					this.putRectPixl({ imgData: this.cursorsImgData, left: 0, top: this.cursors[i], width: this.dataObj.width, height: this.dataObj.charHight, rgb });
				}
				this.setOverLayImgData();
				this.overlayCtx.putImageData(this.overlayImgData, 0, 0);
			} else {
				this.overlayCtx.putImageData(this.selectedImgData, 0, 0);
			}
			this.cursors = null;
		}
		drawAllDiff() {
			this.allDiffImgData.data.fill(0);
			for (let i = 0; i < this.allDiffRanges.length; i++) {
				let item = this.allDiffRanges[i];
				let rgb = this.getDiffColor(item.type);
				this.putRectPixl({ imgData: this.allDiffImgData, left: 0, top: item.top, width: 5, height: item.height, rgb });
			}
			this.setRightImgData();
			this.rightCtx.putImageData(this.rightImgData, 0, 0);
			this.allDiffRanges = null;
		}
		drawAllSelected() {
			let rgb = this.getRgb(this.dataObj.colors['minimap.findMatchHighlight']);
			this.allSelectedImgData.data.fill(0);
			for (let i = 0; i < this.allSelectedData.length; i++) {
				this.putRectPixl({ imgData: this.allSelectedImgData, left: 5, top: this.allSelectedData[i], width: 5, height: this.dataObj.charHight * 2, rgb });
			}
			this.setRightImgData();
			this.rightCtx.putImageData(this.rightImgData, 0, 0);
			this.allSelectedData = null;
		}
		drawAllCursor() {
			let rgb = this.getCursorColor(true);
			this.allCursorImgData.data.fill(0);
			for (let i = 0; i < this.allCursors.length; i++) {
				this.putRectPixl({ imgData: this.allCursorImgData, left: 0, top: this.allCursors[i], width: this.dataObj.rightWidth, height: this.dataObj.charHight, rgb });
			}
			this.setRightImgData();
			this.rightCtx.putImageData(this.rightImgData, 0, 0);
			this.allCursors = null;
		}
		putRectPixl({ imgData, left, top, width, height, rgb }) {
			let index = (imgData.width * top + left) * 4;
			let originIndex = index;
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
					imgData.data[index + 3] = rgb[3] || 255;
				}
			}
		}
		// 定时更新
		render() {
			cancelAnimationFrame(this.renderTimer);
			this.renderTimer = requestAnimationFrame(() => {
				try {
					if (this.dataObj.width && this.dataObj.height && this.dataObj.charHight && this.ctx) {
						if (this.lines) {
							this.drawLines(this.lines);
							this.lines = null;
						} else if (this.singleLines) {
							this.drawSingleLiens(this.singleLines);
							this.singleLines = null;
						}
						if (this.cursors) {
							this.drawCursor();
						}
						if (this.allCursors) {
							this.drawAllCursor();
						}
						if (this.selectedData) {
							this.drawSelectedBg();
						}
						if (this.allSelectedData) {
							this.drawAllSelected();
						}
						if (this.diffRanges) {
							this.drawDiff();
						}
						if (this.allDiffRanges) {
							this.drawAllDiff();
						}
					}
				} catch (e) {
					console.log(e);
				}
			});
		}
		cacheLineObj(item) {
			if (item) {
				this.renderedIdMap[item.lineObj.lineId] = item;
			} else {
				this.renderedIdMap = {};
				this.lines.forEach(item => {
					this.renderedIdMap[item.lineObj.lineId] = item;
				});
			}
		}
		cacheCanvas() {
			let obj = {};
			this.lines.forEach(item => {
				obj[item.lineObj.lineId] = this.cacheMap[item.lineObj.lineId];
			});
			this.cacheMap = obj;
		}
		compairCache(cache, text, preRuleId) {
			if (cache && cache.text === text && cache.preRuleId === preRuleId) {
				return true;
			}
		}
		initData(data) {
			if (data.canvas) {
				this.canvas = data.canvas;
				this.ctx = this.canvas.getContext('2d');
			}
			if (data.overlayCanvas) {
				this.overlayCanvas = data.overlayCanvas;
				this.overlayCtx = this.overlayCanvas.getContext('2d');
			}
			if (data.leftCanvas) {
				this.leftCanvas = data.leftCanvas;
				this.leftDiffCtx = this.leftCanvas.getContext('2d');
			}
			if (data.rightCanvas) {
				this.rightCanvas = data.rightCanvas;
				this.rightCtx = this.rightCanvas.getContext('2d');
			}
		}
		setData(data) {
			if (data.height !== undefined && data.height !== this.dataObj.height) {
				this.canvas.height = data.height;
				this.overlayCanvas.height = data.height;
				this.leftCanvas.height = data.height;
				this.rightCanvas.height = data.height;
			}
			if (data.width !== undefined && data.width !== this.dataObj.width) {
				this.canvas.width = data.width;
				this.overlayCanvas.width = data.width;
			}
			if (data.leftWidth !== undefined && data.leftWidth !== this.dataObj.leftWidth) {
				this.leftCanvas.width = data.leftWidth;
			}
			if (data.rightWidth !== undefined && data.rightWidth !== this.dataObj.rightWidth) {
				this.rightCanvas.width = data.rightWidth;
			}
			Object.assign(this.dataObj, data);
			_clearCache.call(this);

			function _clearCache() {
				// 清空数据
				this.cacheMap = {};
				this.renderedIdMap = {};
				this.lines = null;
				this.singleLines = null;
				if (this.dataObj.width && this.dataObj.height) {
					this.canvasImgData = new ImageData(this.dataObj.width, this.dataObj.height);
					this.cursorsImgData = new ImageData(this.dataObj.width, this.dataObj.height);
					this.selectedImgData = new ImageData(this.dataObj.width, this.dataObj.height);
					this.overlayImgData = new ImageData(this.dataObj.width, this.dataObj.height);
				}
				if (this.dataObj.leftWidth && this.dataObj.height) {
					this.leftDiffCanvasImgData = new ImageData(this.dataObj.leftWidth, this.dataObj.height);
				}
				if (this.dataObj.rightWidth && this.dataObj.height) {
					this.rightImgData = new ImageData(this.dataObj.rightWidth, this.dataObj.height);
					this.allDiffImgData = new ImageData(this.dataObj.rightWidth, this.dataObj.height);
					this.allSelectedImgData = new ImageData(this.dataObj.rightWidth, this.dataObj.height);
					this.allCursorImgData = new ImageData(this.dataObj.rightWidth, this.dataObj.height);
				}
			}
		}
		setOverLayImgData() {
			for (let i = 0; i < this.overlayImgData.data.length; i += 4) {
				this.overlayImgData.data[i] = 0;
				this.overlayImgData.data[i + 1] = 0;
				this.overlayImgData.data[i + 2] = 0;
				this.overlayImgData.data[i + 3] = 0;
				if (this.selectedImgData.data[i + 3]) {
					this.overlayImgData.data[i] = this.selectedImgData.data[i];
					this.overlayImgData.data[i + 1] = this.selectedImgData.data[i + 1];
					this.overlayImgData.data[i + 2] = this.selectedImgData.data[i + 2];
					this.overlayImgData.data[i + 3] = this.selectedImgData.data[i + 3];
				} else if (this.cursorsImgData.data[i + 3]) {
					this.overlayImgData.data[i] = this.cursorsImgData.data[i];
					this.overlayImgData.data[i + 1] = this.cursorsImgData.data[i + 1];
					this.overlayImgData.data[i + 2] = this.cursorsImgData.data[i + 2];
					this.overlayImgData.data[i + 3] = this.cursorsImgData.data[i + 3];
				}
			}
		}
		setRightImgData() {
			for (let i = 0; i < this.rightImgData.data.length; i += 4) {
				this.rightImgData.data[i] = 0;
				this.rightImgData.data[i + 1] = 0;
				this.rightImgData.data[i + 2] = 0;
				this.rightImgData.data[i + 3] = 0;
				if (this.allSelectedImgData.data[i + 3]) {
					this.rightImgData.data[i] = this.allSelectedImgData.data[i];
					this.rightImgData.data[i + 1] = this.allSelectedImgData.data[i + 1];
					this.rightImgData.data[i + 2] = this.allSelectedImgData.data[i + 2];
					this.rightImgData.data[i + 3] = this.allSelectedImgData.data[i + 3];
				}
				if (this.allDiffImgData.data[i + 3]) {
					this.rightImgData.data[i] = this.allDiffImgData.data[i];
					this.rightImgData.data[i + 1] = this.allDiffImgData.data[i + 1];
					this.rightImgData.data[i + 2] = this.allDiffImgData.data[i + 2];
					this.rightImgData.data[i + 3] = this.allDiffImgData.data[i + 3];
				}
				if (this.allCursorImgData.data[i + 3]) {
					this.rightImgData.data[i] = this.allCursorImgData.data[i];
					this.rightImgData.data[i + 1] = this.allCursorImgData.data[i + 1];
					this.rightImgData.data[i + 2] = this.allCursorImgData.data[i + 2];
					this.rightImgData.data[i + 3] = this.allCursorImgData.data[i + 3];
				}
			}
		}
		getLineObj({ lineId, lineObj }) {
			if (lineId) {
				lineObj = this.renderedIdMap[lineId].lineObj;
			} else {
				this.renderedIdMap[lineObj.lineId] = lineObj;
			}
			return lineObj;
		}
		getDrawText(text) {
			text = text.replace(/\t/g, this.dataObj.space);
			return text;
		}
		getDrawTokens(tokens) {
			let htmlTokens = [];
			let preToken = null;
			for (let i = 0; i < tokens.length; i++) {
				let item = tokens[i];
				let scopeId = item.scopeId;
				if (preToken && _compair.call(this, preToken.scopeId, scopeId)) {
					preToken.endIndex = item.endIndex;
					continue;
				}
				preToken = {
					scopeId: scopeId,
					startIndex: item.startIndex,
					endIndex: item.endIndex
				};
				htmlTokens.push(preToken);
			}
			return htmlTokens;

			function _compair(scope1, scope2) {
				scope1 = this.dataObj.scopeIdMap[scope1];
				scope2 = this.dataObj.scopeIdMap[scope2];
				scope1 = (scope1 && scope1.settingsStr) || '';
				scope2 = (scope2 && scope2.settingsStr) || '';
				return scope1 === scope2;
			}
		}
		getCharImgData(char, rgb) {
			let data = this.getCharImgDataCache[char];
			if (!this.getCharImgDataCache[char]) {
				let offscreen = new OffscreenCanvas(this.dataObj.charHight, this.dataObj.charHight);
				let offCtx = offscreen.getContext('2d');
				let width = 1;
				offCtx.font = `bold ${this.dataObj.charHight}px Consolas`;
				offCtx.textBaseline = 'top';
				offCtx.fillText(char, 0, 0);
				data = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
				// 获取字符真实宽度
				// for (let h = 0; h < this.dataObj.charHight; h++) {
				// 	for (let w = 0; w < this.dataObj.charHight; w++) {
				// 		let index = (h * this.dataObj.charHight + w) * 4;
				// 		if (data[index + 3] !== 0) {
				// 			width = Math.max(width, w + 1);
				// 		}
				// 	}
				// }
				// 截取字符像素
				let arr = [];
				for (let h = 0; h < this.dataObj.charHight; h++) {
					let line = new Array(width).fill(0).map(() => {
						return [0, 0, 0, 0];
					});
					for (let w = 0; w < width; w++) {
						let index = (h * this.dataObj.charHight + w) * 4;
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
				data.height = this.dataObj.charHight;
				this.getCharImgDataCache[char] = data;
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
		getRgb(color) {
			if (!this.getRgbCache[color]) {
				let rgb = [];
				for (let i = 1; i <= color.length - 2; i += 2) {
					rgb.push(Number('0x' + color[i] + color[i + 1]));
				}
				this.getRgbCache[color] = rgb;
			}
			return this.getRgbCache[color];
		}
		getDiffColor(type) {
			let color = this.dataObj.colors['editor.foreground'];
			switch (type) {
				case 'A':
					color = this.dataObj.colors['gitDecoration.addedResourceForeground'];
					break;
				case 'M':
					color = this.dataObj.colors['gitDecoration.modifiedResourceForeground'];
					break;
				case 'D':
					color = this.dataObj.colors['gitDecoration.deletedResourceForeground'];
					break;
			}
			return this.getRgb(color);
		}
		getCursorColor(useTextColor) {
			let rgb = this.dataObj.colors['editor.lineHighlightBackground'];
			if (useTextColor) {
				rgb = this.dataObj.colors['editor.foreground'];
			}
			if (rgb !== 'transparent') {
				rgb = this.getRgb(rgb);
			} else {
				rgb = this.getRgb(this.dataObj.colors['editor.lineHighlightBorder']);
			}
			return rgb;
		}
	}

	const workerMap = {};

	self.onmessage = function (e) {
		let data = e.data;
		let event = data.event;
		let id = data.id;
		let worker = workerMap[id];
		if (!worker) {
			worker = new Minimap();
			workerMap[id] = worker;
		}
		data = data.data;
		switch (event) {
			case 'init':
				worker.initData(data);
				break;
			case 'set-data':
				worker.setData(data);
				break;
			case 'render-data': //分批传输待渲染数据
				worker._lines = worker._lines.concat(data);
				break;
			case 'render-line':
				let line = data;
				let lineObj = worker.getLineObj(line);
				line.lineObj = lineObj;
				worker.singleLines = worker.singleLines || {};
				worker.singleLines[lineObj.lineId] = line;
				worker.cacheLineObj(line);
				break;
			case 'render':
				worker.lines = worker._lines;
				worker.lines.map(item => {
					item.lineObj = worker.getLineObj(item);
				});
				worker._lines = [];
				worker.singleLines = null;
				worker.cacheLineObj();
				break;
			case 'render-diff':
				worker.diffRanges = data;
				break;
			case 'render-diff-all':
				worker.allDiffRanges = data;
				break;
			case 'render-cursor':
				worker.cursors = data;
				break;
			case 'render-cursor-all':
				worker.allCursors = data;
				break;
			case 'render-selected-bg':
				worker.selectedData = data;
				break;
			case 'render-selected-all':
				worker.allSelectedData = data;
				break;
		}
		worker.render();
	};
}