import Util from '../../common/util';
import globalData from '../../data/globalData';

export default class {
	constructor() {}
	storeData() {
		this.storeGlobalData();
	}
	storeGlobalData() {
		let data = {
			nowTheme: globalData.nowTheme,
			nowIconTheme: globalData.nowIconTheme,
		};
		Util.writeFileSync(globalData.configPath, JSON.stringify(data));
	}
}
