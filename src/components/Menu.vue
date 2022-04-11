<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
    <div :style="styles" @mousedown.stop class="my-menu my-shadow my-border" ref="scroller">
        <div v-show="visible" ref="content">
            <div class="my-menu-group" v-for="group in myMenuList">
                <div
                    :class="{
                        'my-active': checkable && item.checked,
                        disabled: item.disabled,
                    }"
                    @mousedown="onClick(item)"
                    @mouseover="onHover(item)"
                    class="my-menu-item my-center-between my-hover"
                    v-for="item in group"
                >
                    <div class="my-center-between">
                        <div class="my-menu-title">{{ item.name }}</div>
                        <div class="my-menu-shortcut" v-if="item.shortcut">
                            {{ item.shortcut }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import $ from 'jquery';
export default {
    name: 'Menu',
    props: {
        menuList: {
            type: Array,
            default: [],
        },
        styles: {
            type: Object,
        },
        checkable: {
            type: Boolean,
            default: true,
        },
        hoverCheck: {
            type: Boolean,
            default: false,
        },
        value: {
            type: [Number, String],
        },
    },
    data() {
        return {
            index: -1,
            itemHeight: 22,
            myMenuList: [],
        };
    },
    computed: {
        visible() {
            for (let i = 0; i < this.myMenuList.length; i++) {
                if (this.myMenuList[i].length) {
                    return true;
                }
            }
            return false;
        },
    },
    watch: {
        menuList() {
            this.initMenu();
        },
        value(newVal) {
            this.setChecked(newVal);
        },
        index() {
            let $scroller = this.$refs.scroller;
            let height = (this.index + 1) * this.itemHeight;
            if ($scroller && height > $scroller.clientHeight + $scroller.scrollTop) {
                $scroller.scrollTop = height - $scroller.clientHeight;
            } else if ($scroller && height < $scroller.scrollTop + this.itemHeight) {
                $scroller.scrollTop = height - this.itemHeight;
            }
        },
    },
    created() {
        this.initMenu();
    },
    mounted() {
        this.keydownFn = (e) => {
            if (this.$refs.content.clientHeight) {
                if (e.keyCode === 38) {
                    this.setCheckedByIndex(this.index - 1);
                } else if (e.keyCode === 40) {
                    this.setCheckedByIndex(this.index + 1);
                } else if (e.keyCode === 13) {
                    if (this.index > -1) {
                        this.$emit('change', this.indexMap[this.index]);
                    }
                }
            }
        };
        $(window).on('keydown', this.keydownFn);
    },
    destroyed() {
        $(window).unbind('keydown', this.keydownFn);
    },
    methods: {
        initMenu() {
            let index = -1;
            let menuList = this.menuList;
            this.index = -1;
            this.maxIndex = -1;
            this.indexMap = {};
            if (menuList[0] && !(menuList[0] instanceof Array)) {
                menuList = [menuList];
            }
            this.myMenuList = menuList.map((group) => {
                return group.map((item) => {
                    item = Object.assign({}, item);
                    item.value = item.value === undefined ? item.name : item.value;
                    item.checked = item.value === this.value;
                    this.indexMap[++index] = item;
                    this.maxIndex = index;
                    if (item.checked) {
                        this.index = index;
                    }
                    return item;
                });
            });
        },
        onClick(item) {
            if (item.disabled) {
                return;
            }
            this.clearChecked();
            item.checked = true;
            this.$emit('change', item);
        },
        onHover(item) {
            this.hoverCheck && this.setChecked(item.value);
        },
        setChecked(value) {
            let index = -1;
            this.myMenuList.forEach((group) => {
                group.forEach((item) => {
                    item.checked = item.value === value;
                    index++;
                    if (item.checked) {
                        this.index = index;
                    }
                });
            });
            this.myMenuList.splice();
        },
        setCheckedByIndex(index) {
            this.clearChecked();
            if (index < 0) {
                index = this.maxIndex;
            } else if (index > this.maxIndex) {
                index = 0;
            }
            this.indexMap[index].checked = true;
            this.index = index;
            this.myMenuList.splice();
        },
        clearChecked() {
            this.myMenuList.forEach((group) => {
                group.forEach((item) => {
                    item.checked = false;
                });
            });
        },
    },
};
</script>