/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description: 
 */
import Util from '@/common/Util';

export default class {
    constructor(menuBar) {
        this.initProperties(menuBar);
    }
    initProperties(menuBar) {
        Util.defineProperties(this, menuBar, [
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
                        this.openFolder();
                        break;
                }
            } else {
                switch (e.keyCode) {
                    case 75: //Ctrl+K
                        this.pressK = true;
                        break;
                    case 78: //Ctrl+N
                        this.openFile();
                        break;
                    case 79: //Ctrl+O
                        this.openFile(null, true);
                        break;
                }
            }
        }
    }
}