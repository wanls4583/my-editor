/*
 * @Author: lisong
 * @Date: 2022-03-04 16:13:41
 * @Description: 
 */
class Node {
    constructor(m) {
        this.dataList = new Array(m + 1);
        this.linkList = new Array(m + 2);
        this.next = null;
        this.prev = null;
        this.pNode = null;
    }
}
class Btree {
    constructor(compare, m) {
        this.m = m || 4;
        this.root = null;
        this.head = null;
        this.compare = compare || function (a, b) {
            return a - b;
        }
    }
    insert(value) {
        if (!this.root) {
            let node = new Node(this.m);
            node.dataList[0] = value;
            this.root = node;
            this.head = node;
            return node;
        }
        let node = this._search(value, true);
        let link = null;
        for (let i = 0; i < this.m; i++) {
            if (this.compare(value, node.dataList[i]) === 0) {
                return node;
            }
        }
        while (node) {
            let linkList = node.linkList;
            let dataList = node.dataList;
            for (let i = 0; i < this.m + 1; i++) {
                let data = dataList[i];
                if (!dataList[i] || this.compare(value, data) < 0) {
                    for (let j = this.m; j >= i + 1; j--) { //后移元素
                        dataList[j] = dataList[j - 1];
                        linkList[j + 1] = linkList[j];
                    }
                    dataList[i] = value;
                    linkList[i + 1] = link;
                    break;
                }
            }
            if (dataList[this.m]) { //超过了最大限制
                let newNode = new Node(this.m);
                let n = Math.floor(this.m / 2) || 1; //m为1时，n应该也为1
                value = dataList[n]; //父节点需要插入的值
                if (node.next) {
                    node.next.prev = newNode;
                }
                newNode.next = node.next;
                node.next = newNode;
                newNode.prev = node;
                newNode.pNode = node.pNode;
                link = newNode;
                for (let i = n, j = 0; i < this.m + 1; i++, j++) {
                    newNode.dataList[j] = dataList[i];
                    newNode.linkList[j + 1] = linkList[i + 1];
                    if (newNode.linkList[j + 1]) {
                        newNode.linkList[j + 1].pNode = newNode;
                    }
                    dataList[i] = null;
                    linkList[i + 1] = null;
                }
                if (!node.pNode) { //上溢到了根节点
                    this.root = new Node(this.m);
                    this.root.dataList[0] = value;
                    this.root.linkList[0] = node;
                    this.root.linkList[1] = newNode;
                    node.pNode = this.root;
                    newNode.pNode = this.root;
                    break;
                }
                node = node.pNode;
            } else {
                break;
            }
        }
    }
    delete(value) {

    }
    search(value) {
        return this._search(value);
    }
    forEach(cb) {
        let node = this.head;
        while (node) {
            let dataList = node.dataList;
            dataList.map((item) => {
                cb(item);
            });
            node = node.next;
        }
    }
    _search(value, isInsert) {
        let node = this.root;
        while (node) {
            let linkList = node.linkList;
            let dataList = node.dataList;
            for (let i = 0; i < this.m; i++) {
                let res = this.compare(value, dataList[i]);
                if (res === 0) {
                    if (linkList[i + 1]) { //右侧子节点存放了父节点
                        node = linkList[i + 1];
                        break;
                    } else {
                        return node;
                    }
                } else if (res > 0) {
                    if (!dataList[i + 1] || this.compare(value, dataList[i + 1]) < 0) { //目标在右侧子树中
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