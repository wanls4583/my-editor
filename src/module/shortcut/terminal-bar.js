/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import Util from '@/common/util';

export default class {
	constructor() { }
	onKeydown(e) {
		if(globalData.compositionstart) { //正在输中文，此时不做处理
			return;
		}
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
