let renderedIdMap = [];
let dataObj = {};
let ctx = null;
let canvas = null;

function drawLine({ top, lineObj }) {
	let cache = renderedIdMap[lineObj.lineId];
	let tokens = lineObj.tokens;
	let html = '';
	ctx.clearRect(0, top, dataObj.canvasWidth, dataObj.charHight);
	html = lineObj.html || lineObj.text;
	if (cache && cache.html === html) {
		ctx.drawImage(cache.canvas, 20, top);
	} else {
		let offscreen = new OffscreenCanvas(dataObj.canvasWidth, dataObj.charHight);
		let offCtx = offscreen.getContext('2d');
		offCtx.font = `${14}px Consolas`;
		offCtx.textBaseline = 'middle';
		if (tokens) {
			let left = 20;
			for (let i = 0; i < tokens.length; i++) {
				let token = tokens[i];
				let text = lineObj.text.slice(token.startIndex, token.endIndex);
				text = text.replace(/[a-zA-Z]/g, '▉ ');
				text = text.replace(/\t/g, '    ');
				offCtx.fillStyle = dataObj.colors['editor.foreground'];
				if (token.scopeId) {
					let scope = dataObj.scopeIdMap[token.scopeId];
					if (scope.settings && scope.settings.foreground) {
						offCtx.fillStyle = scope.settings.foreground;
					}
				}
				offCtx.fillText(text, left, dataObj.charHight / 2);
				left += offCtx.measureText(text).width;
				// 退出无效渲染
				if (left > dataObj.canvasWidth) {
					break;
				}
			}
		} else {
			offCtx.fillStyle = dataObj.colors['editor.foreground'];
			offCtx.fillText(lineObj.text.replace(/[a-zA-Z]/g, '▉ ').replace(/\t/g, '    '), 20, dataObj.charHight / 2);
		}
		// offscreen = offscreen.transferToImageBitmap();
		ctx.drawImage(offscreen, 20, top);
		renderedIdMap[lineObj.lineId] = {
			html: html,
			canvas: offscreen,
		};
	}
}

function drawLines(lines) {
	ctx.clearRect(0, 0, dataObj.canvasWidth, dataObj.canvasHeight);
	lines.forEach(line => {
		this.drawLine(line);
	});
}

onmessage = function (e) {
	let data = e.data;
	switch (data.event) {
		case 'init':
			canvas = data.data.canvas;
			ctx = canvas.getContext('2d');
			break;
		case 'init-data':
			Object.assign(dataObj, data.data);
			if (dataObj.canvasHeight) {
				canvas.height = dataObj.canvasHeight;
			}
			break;
		case 'render-line':
			drawLine(data.data);
			break;
		case 'render':
			drawLines(data.data);
			break;
	}
};
