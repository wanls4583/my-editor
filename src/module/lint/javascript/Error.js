/*
 * @Author: lisong
 * @Date: 2022-01-05 12:00:03
 * @Description: 
 */
import ErrorType from './ErrorType';
export default class {
    constructor(error, type) {
        this._error = error;
        this._type = type || ErrorType.UNEXPECTED;
    }
    toString() {
        return this._error;
    }
}