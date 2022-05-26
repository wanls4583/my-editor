/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import Util from '@/common/util';

export default class {
	constructor(terminalBar) {
		this.initProperties(terminalBar);
	}
	initProperties(terminalBar) {
		Util.defineProperties(this, terminalBar, ['$emit']);
	}
	onKeydown(e) {
		if (e.ctrlKey) {
			if (this.pressK) {
				this.pressK = false;
				switch (e.keyCode) {
				}
			} else {
				switch (e.keyCode) {
				}
			}
		}
	}
}
