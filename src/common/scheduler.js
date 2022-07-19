export default class {
	constructor() {
		this.taskId = 1;
		this.uiTaskId = 1;
		this.queue = [];
		this.uiQueue = [];
		this.frameTime = 15;
		this.channel = new MessageChannel();
		this.channel.port2.onmessage = e => {
			if (e.data === 'run') {
				this.run();
			}
		};
		this.uiRun();
	}
	addUiTask(task) {
		let taskId = this.uiTaskId++;
		task = {
			__id__: taskId,
			__task__: task,
		};
		this.uiQueue.push(task);
		return taskId;
	}
	removeUiTask(taskId) {
		this.uiQueue = this.uiQueue.filter(task => {
			return task.__id__ !== taskId;
		});
	}
	uiRun() {
		for (let i = 0; i < this.uiQueue.length; i++) {
			this.uiQueue[i].__task__();
		}
		if (this.pending) {
			this.pending = false;
			this.channel.port1.postMessage('run');
		}
		this.uiTimestamp = Date.now();
		setTimeout(() => {
			this.uiRun();
		}, this.frameTime);
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
		let timestamp = Date.now();
		let minGap = Infinity;
		let done = false;
		if (timestamp - this.uiTimestamp >= this.frameTime) {
			this.pending = true;
			return;
		}
		for (var i = 0; i < this.queue.length; i++) {
			let task = this.queue[i];
			let timeGap = timestamp - task.__time__;
			if (!done && timeGap >= task.delay) {
				if (task.loop) {
					task.__time__ = timestamp;
					minGap = Math.min(minGap, task.delay);
				} else {
					this.queue.splice(i, 1);
					i--;
				}
				task.__task__();
			} else {
				minGap = Math.min(minGap, timeGap);
			}
		}
		if (this.queue.length) {
			if (minGap > 4) {
				setTimeout(() => {
					this.run();
				}, 0);
			} else {
				this.channel.port1.postMessage('run');
			}
		}
	}
}
