/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description: 
 */
import Util from '@/common/util';

export default class {
    constructor(titleBar) {
        this.initProperties(titleBar);
    }
    initProperties(titleBar) {
        Util.defineProperties(this, titleBar, [
            'openFile',
            'openFolder'
        ]);
    }
    onKeyDown(e) {
        if (e.ctrlKey) {
            if (this.pressK) {
                this.pressK = false;
                switch (e.keyCode) {
                    case 79: //Ctrl+O
                        e.preventDefault();
                        this.openFolder();
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
                        this.openFile();
                        break;
                    case 79: //Ctrl+O
                        e.preventDefault();
                        this.openFile(null, true);
                        break;
                }
            }
        }
    }
}