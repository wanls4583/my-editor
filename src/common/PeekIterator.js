export default class {
    constructor(arr) {
        this._arr = arr;
        this._index = 0;
    }
    peek() {
        return this._arr[this._arr.length - 1];
    }
    putBack() {
        this._index--;
    }
    hasNext() {
        return this.index < this._arr.length;
    }
    next() {
        return this._arr[this.index++];
    }
    index() {
        return this._index;
    }
}