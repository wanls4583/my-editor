<!--
 * @Author: lisong
 * @Date: 2022-05-09 13:15:02
 * @Description: 
-->
<template>
    <div @contextmenu.prevent.stop class="my-activity-bar">
        <div class="bar-item" :class="{ 'my-active': activity === 'files' }" @click="onChange('files')"><i class="my-icon my-icon-files"></i></div>
        <div class="bar-item" :class="{ 'my-active': activity === 'search' }" @click="onChange('search')"><i class="my-icon my-icon-search"></i></div>
    </div>
</template>
<script>
import EventBus from '@/event';
import $ from 'jquery';

export default {
    name: 'ActivityBar',
    components: {},
    data() {
        return {
            activity: 'files',
        };
    },
    mounted() {
        this.initEvent();
    },
    methods: {
        initEvent() {},
        onChange(activity) {
            this.activity = activity;
            EventBus.$emit('activity-change', activity);
        },
    },
};
</script>
