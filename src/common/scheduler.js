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
	addTask(task, { level = 1, delay = 0 } = {}) {
		let taskId = this.taskId++;
		task = {
			__id__: taskId,
			__task__: task,
			__time__: Date.now(),
			level: level,
			delay: delay,
		};
		for (let i = this.queue.length - 1; i >= 0; i--) {
			// 离栈顶越近，优先级越高
			if (this.queue[i].level <= task.level) {
				this.queue.splice(i + 1, 0, task);
				task = null;
				break;
			}
		}
		if (task) {
			this.queue.unshift(task);
		}
		this.channel.port1.postMessage('run');
		return taskId;
	}
	removeTask(taskId) {
		this.queue = this.queue.filter(task => {
			return task.__id__ !== taskId;
		});
	}
	run() {
		let timestamp = Date.now();
		for (let i = this.queue.length - 1; i >= 0; i--) {
			let task = this.queue[i];
			if (timestamp - task.__time__ >= task.delay) {
				this.queue.splice(i, 1);
				task.__task__();
				break;
			}
		}
		if (this.queue.length) {
			this.channel.port1.postMessage('run');
		}
	}
}
