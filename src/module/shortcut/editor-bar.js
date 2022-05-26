/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description: 
 */
import Util from '@/common/util';

export default class {
    constructor(editorBar) {
        this.initProperties(editorBar);
    }
    initProperties(editorBar) {
        Util.defineProperties(this, editorBar, [
            '$emit',
        ]);
    }
    onKeydown(e) {
        if (e.ctrlKey) {
            if (this.pressK) {
                this.pressK = false;
                switch (e.keyCode) {
                    case 85: //Ctrl+U
                        e.preventDefault();
                        this.$emit('close-saved');
                        break;
                    case 87: //Ctrl+W
                        e.preventDefault();
                        this.$emit('close-all');
                        break;
                }
            } else {
                switch (e.keyCode) {
                    case 75: //Ctrl+K
                        e.preventDefault();
                        this.pressK = true;
                        break;
                    case 115: //Ctrl+F4
                        e.preventDefault();
                        this.$emit('close');
                        break;
                }
            }
        }
    }
}