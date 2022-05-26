/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import EventBus from '@/event';

export default class {
	constructor(titleBar) {
		this.initProperties(titleBar);
	}
	initProperties(titleBar) {}
	onKeydown(e) {
		if (e.ctrlKey) {
			if (this.pressK) {
				this.pressK = false;
				switch (e.keyCode) {
					case 79: //Ctrl+O
						e.preventDefault();
						EventBus.$emit('folder-open');
						break;
				}
			} else {
				switch (e.keyCode) {
					case 75: //Ctrl+K
						e.preventDefault();
						this.pressK = true;
						break;
					case 78: //Ctrl+N
						e.preventDefault();
						EventBus.$emit('file-open');
						break;
					case 79: //Ctrl+O
						e.preventDefault();
						EventBus.$emit('file-open', null, true);
						break;
				}
			}
		}
	}
}
