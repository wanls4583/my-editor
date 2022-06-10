export default class {
	constructor() {
		this.taskId = 1;
		this.queue = [];
		this.channel = new MessageChannel();
		this.channel.port2.onmessage = e => {
			if (e.data === 'run') {
				this.run();
			}
		};
	}
	addTask(task, { level = 1, delay = 0, loop = false } = {}) {
		let taskId = this.taskId++;
		task = {
			__id__: taskId,
			__task__: task,
			__time__: Date.now(),
			level: level,
			delay: delay,
			loop: loop,
		};
		// 循环的任务，立刻执行一次
		loop && task.__task__();
		// 按优先级加入队列，离队首越近，优先级最高
		for (let i = this.queue.length - 1; i >= 0; i--) {
			if (this.queue[i].level >= task.level) {
				this.queue.splice(i + 1, 0, task);
				task = null;
				break;
			}
		}
		task && this.queue.unshift(task);
		this.channel.port1.postMessage('run');
		return taskId;
	}
	removeTask(taskId) {
		this.queue = this.queue.filter(task => {
			return task.__id__ !== taskId;
		});
	}
	run() {
		const timestamp = Date.now();
		for (let i = 0; i < this.queue.length; i++) {
			let task = this.queue[i];
			if (timestamp - task.__time__ >= task.delay) {
				if (task.loop) {
					task.__time__ = timestamp;
				} else {
					this.removeTask(task.__id__);
				}
				task.__task__();
				break;
			}
		}
		this.queue.length && this.channel.port1.postMessage('run');
	}
}
