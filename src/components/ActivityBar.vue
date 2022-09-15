<!--
 * @Author: lisong
 * @Date: 2022-05-09 13:15:02
 * @Description: 
-->
<template>
    <div @contextmenu.prevent.stop class="my-activity-bar">
        <div class="bar-item" :class="{ 'my-active': activity === 'files' }" @click="onChange('files')"><i class="my-icon icon-files"></i></div>
        <div class="bar-item" :class="{ 'my-active': activity === 'search' }" @click="onChange('search')"><i class="my-icon icon-search"></i></div>
		<div class="bar-holder"></div>
    </div>
</template>
<script>
import EventBus from '@/event';

export default {
    name: 'ActivityBar',
    components: {},
    data() {
        return {
            activity: 'files',
        };
    },
    watch: {
        activity() {
            EventBus.$emit('activity-change', this.activity);
        }
    },
    mounted() {
        this.initEvent();
    },
    methods: {
        initEvent() {
            EventBus.$on('find-in-folder', () => {
                this.activity = 'search';
            });
        },
        onChange(activity) {
            this.activity = activity;
        },
    },
};
</script>
