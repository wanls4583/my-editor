/*
 * @Author: lisong
 * @Date: 2022-03-04 16:13:41
 * @Description: 
 */
class Node {
    constructor(max) {
        this.dataList = new Array(max + 1);
        this.linkList = new Array(max + 2);
        this.num = 0;
        this.next = null;
        this.prev = null;
        this.pNode = null;
    }
}
class Btree {
    /**
     * 构造器
     * @param {Function} compare 比较器
     * @param {Number} max 节点可存储的最大数量 
     */
    constructor(compare, max) {
        this.max = max || 4;
        this.root = null;
        this.head = null;
        this.size = 0;
        this.compare = compare || function (a, b) {
            return a - b;
        }
    }
    /**
     * 插入
     * @param {Any} value 
     */
    insert(value) {
        if (!this.root) {
            let node = new Node(this.max);
            node.dataList[0] = value;
            node.num++;
            this.root = node;
            this.head = node;
            this.size++;
            this.arrayCache = null;
            return;
        }
        let node = this._search(value, true);
        let link = null;
        let half = Math.floor(this.max / 2) || 1; //m为1时，n应该也为1
        let result = this.iterator(node, value);
        for (let i = 0; i < node.num; i++) {
            if (this.compare(value, node.dataList[i]) === 0) {
                return result;
            }
        }
        this.size++;
        this.arrayCache = null;
        while (node) {
            let linkList = node.linkList;
            let dataList = node.dataList;
            for (let i = 0; i < node.num; i++) {
                let data = dataList[i];
                if (this.compare(value, data) < 0) {
                    _insert(dataList, linkList, i);
                    break;
                } else if (i === node.num - 1) {
                    _insert(dataList, linkList, i + 1);
                }
            }
            node.num++; //关键字数量加1
            if (node.num <= this.max) { //存储数量未超过最大限制，直接结束插入
                break;
            }
            let newNode = new Node(this.max);
            let isPnode = node.linkList[0];
            value = dataList[half]; //父节点需要插入的值
            if (!isPnode) { //叶子节点更新前后件
                if (node.next) {
                    node.next.prev = newNode;
                }
                newNode.next = node.next;
                node.next = newNode;
                newNode.prev = node;
                newNode.pNode = node.pNode;
            }
            link = newNode;
            //复制数据到新节点，如果是叶子节点，需要把value留在叶子节点中
            for (let i = (isPnode ? half + 1 : half), j = 0; i < node.num; i++, j++) {
                newNode.dataList[j] = dataList[i];
                newNode.linkList[j + 1] = linkList[i + 1];
                if (newNode.linkList[j + 1]) {
                    newNode.linkList[j + 1].pNode = newNode;
                }
                dataList[i] = null;
                linkList[i + 1] = null;
                newNode.num++;
            }
            node.num = half; //关键字数量为最大值的一半
            if (isPnode) {
                node.dataList[node.num] = null;
                // 非叶子节点，需要把左侧最后一个指针域复制过来
                newNode.linkList[0] = node.linkList[node.num + 1];
                if (newNode.linkList[0]) {
                    newNode.linkList[0].pNode = newNode;
                }
                node.linkList[node.num + 1] = null;
            }
            if (!node.pNode) { //上溢到了根节点
                this.root = new Node(this.max);
                this.root.dataList[0] = value;
                this.root.linkList[0] = node;
                this.root.linkList[1] = newNode;
                this.root.num = 1;
                node.pNode = this.root;
                newNode.pNode = this.root;
                break;
            }
            node = node.pNode;
        }
        return result;

        // 在i位置插入数据
        function _insert(dataList, linkList, i) {
            for (let j = node.num; j >= i + 1; j--) { //后移元素
                dataList[j] = dataList[j - 1];
                linkList[j + 1] = linkList[j];
            }
            dataList[i] = value;
            linkList[i + 1] = link;
            if (link) {
                link.pNode = node;
            }
        }
    }
    /**
     * 删除
     * @param {Any} value 
     */
    delete(value) {
        let that = this;
        let node = this._search(value);
        let result = null;
        let half = Math.floor(this.max / 2) || 1;
        if (node) {
            let dataList = node.dataList;
            for (let i = 0; i < node.num; i++) {
                if (this.compare(value, dataList[i]) === 0) {
                    result = dataList[i];
                    for (let j = i; j < node.num; j++) { //前移元素
                        dataList[j] = dataList[j + 1];
                    }
                    break;
                }
            }
            node.num--;
            this.size--;
            if (!this.size) {
                this.root = null;
                return result;
            }
            this.arrayCache = null;
        }
        while (node && node.num < half && node.pNode) {
            let pNode = node.pNode;
            let pIndex = pNode.linkList.indexOf(node);
            let leftNode = pNode.linkList[pIndex - 1];
            let rightNode = pNode.linkList[pIndex + 1];
            let isPnode = node.linkList[0];
            if (leftNode && leftNode.num > half) { //从左节点借
                _moveRight(node, 1);
                if (!isPnode) {
                    pNode.dataList[pIndex - 1] = leftNode.dataList[leftNode.num - 1];
                }
                node.dataList[0] = pNode.dataList[pIndex - 1];
                node.linkList[0] = leftNode.linkList[leftNode.num];
                if (node.linkList[0]) {
                    node.linkList[0].pNode = node;
                }
                pNode.dataList[pIndex - 1] = leftNode.dataList[leftNode.num - 1];
                leftNode.dataList[leftNode.num - 1] = null;
                leftNode.linkList[leftNode.num] = null;
                leftNode.num--;
                node.num++;
            } else if (rightNode && rightNode.num > half) { //从右节点借
                node.dataList[node.num] = pNode.dataList[pIndex];
                node.linkList[node.num + 1] = rightNode.linkList[0];
                if (node.linkList[node.num + 1]) {
                    node.linkList[node.num + 1].pNode = node;
                }
                if (!isPnode) {
                    pNode.dataList[pIndex] = rightNode.dataList[1];
                } else {
                    pNode.dataList[pIndex] = rightNode.dataList[0];
                }
                _moveLeft(rightNode, 1);
                rightNode.num--;
                node.num++;
            } else if (rightNode) { //向右合并
                _join(node.pNode, pIndex, node, rightNode);
            } else if (leftNode) { //向左合并
                _join(node.pNode, pIndex - 1, leftNode, node);
            }
        }
        return result;

        function _join(pNode, pIndex, leftNode, rightNode) {
            let isPnode = leftNode.linkList[0] ? 1 : 0;
            // 右移右节点
            _moveRight(rightNode, leftNode.num + isPnode);
            //复制左节点到右节点
            for (let i = 0; i < leftNode.num; i++) {
                rightNode.dataList[i] = leftNode.dataList[i];
                rightNode.linkList[i + 1] = leftNode.linkList[i + 1];
                if (rightNode.linkList[i + 1]) {
                    rightNode.linkList[i + 1].pNode = rightNode;
                }
            }
            rightNode.linkList[0] = leftNode.linkList[0];
            if (rightNode.linkList[0]) {
                rightNode.linkList[0].pNode = rightNode;
            }
            if (isPnode) { //当前节点非叶子节点，父节点下移
                rightNode.dataList[leftNode.num] = pNode.dataList[pIndex];
            }
            _moveLeft(pNode, 1, pIndex); //删除父节点和左域
            rightNode.num += leftNode.num + isPnode;
            pNode.num--;
            if (!isPnode) { //叶子节点更新前后件
                if (that.head === leftNode) { //头结点被删除
                    that.head = rightNode;
                } else {
                    leftNode.prev.next = rightNode;
                    rightNode.prev = leftNode.prev;
                }
            }
            if (!pNode.num) { //已经到了根节点
                that.root = rightNode;
                that.root.pNode = null;
                node = null;
            } else {
                node = pNode;
            }
        }

        //右移num个节点
        function _moveRight(target, num) {
            for (let i = target.num - 1; i >= 0; i--) {
                target.dataList[num + i] = target.dataList[i];
                target.linkList[num + i + 1] = target.linkList[i + 1];
            }
            target.linkList[num] = target.linkList[0];
        }

        //左移num个节点
        function _moveLeft(target, num, index) {
            index = index || 0;
            for (let i = index; i < target.num; i++) {
                target.dataList[i] = target.dataList[i + num];
                target.linkList[i] = target.linkList[i + num];
            }
            target.linkList[target.num] = target.linkList[target.num + num];
        }
    }
    /**
     * 查找
     * @param {Any} value 
     * @param {Function} compare 自定义查找比较器 
     * @param {Boolean} insert 是否查找查找最近的节点 
     */
    search(value, compare, insert) {
        let result = this._search(value, insert, compare);
        if (result) {
            result = this.iterator(result, value, compare);
        }
        return result;
    }
    /**
     * 把搜索结果封装成迭代器
     * @param {Node} result 
     * @param {Any} value 
     */
    iterator(result, value, compare) {
        let index = 0;
        let orginIndex = 0;
        let originResult = result;
        compare = compare || this.compare;
        for (let i = 0; i < result.num; i++) {
            let item = result.dataList[i];
            if (compare(value, item) === 0) {
                index = i;
                orginIndex = i;
                break;
            }
        }

        return {
            next: _next,
            prev: _prev,
            reset: function () {
                index = orginIndex;
                result = originResult;
            }
        }

        function _next() {
            if (index < result.num) {
                return result.dataList[index++];
            } else if (result.next) {
                result = result.next;
                index = 0;
                return result.dataList[index];
            }
            return null;
        }

        function _prev() {
            index--;
            if (index >= 0) {
                return result.dataList[index];
            } else if (result.prev) {
                result = result.prev;
                index = result.num - 1;
                return result.dataList[index];
            } else {
                index++;
            }
            return null;
        }
    }
    forEach(cb) {
        this.toArray().map((item) => {
            cb(item);
        });
    }
    toArray() {
        if (this.arrayCache) {
            return this.arrayCache;
        }
        let results = [];
        let node = this.head;
        while (node) {
            let dataList = node.dataList;
            for (let index = 0; index < node.num; index++) {
                results.push(dataList[index]);
            }
            node = node.next;
        }
        this.arrayCache = results;
        return results;
    }
    get(index) {
        let node = this.head;
        let count = -1;
        while (node) {
            let dataList = node.dataList;
            for (let i = 0; i < node.num; i++) {
                count++;
                if (count == index) {
                    return dataList[i];
                }
            }
            node = node.next;
        }
        return null;
    }
    empty() {
        this.root = null;
        this.head = null;
        this.size = 0;
        this.arrayCache = null;
    }
    _search(value, isInsert, compare) {
        let node = this.root;
        compare = compare || this.compare;
        while (node) {
            let linkList = node.linkList;
            let dataList = node.dataList;
            for (let i = 0; i < node.num; i++) {
                let res = compare(value, dataList[i]);
                if (res === 0) {
                    if (linkList[i + 1]) { //右侧子节点存放了父节点
                        node = linkList[i + 1];
                        break;
                    } else {
                        return node;
                    }
                } else if (res > 0) {
                    if (!dataList[i + 1] || compare(value, dataList[i + 1]) < 0) { //目标在右侧子树中
                        if (linkList[i + 1]) {
                            node = linkList[i + 1];
                            break;
                        } else {
                            return isInsert ? node : null;
                        }
                    }
                } else { //目标在左侧子树中
                    if (linkList[i]) {
                        node = linkList[i];
                        break;
                    } else {
                        return isInsert ? node : null;
                    }
                }
            }
        }
    }
}

export default Btree;