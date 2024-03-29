# my-editor

> A simple code editor developed with Electron + Vue2 + JavaScript.

## 内容

- [**`功能特性`**](#功能特性)
- [**`编译步骤`**](#编译步骤)
- [**`主题预览`**](#主题预览)
- [**`下载链接`**](#下载链接)
- [**`贡献`**](#贡献)

## 功能特性
* [x] 使用 Electron + Vue2 + JavaScript 开发
* [x] 内置多主题，支持半透明主题
* [x] 支持 git 状态追踪和内容更改
* [x] 支持多终端
* [x] 支持小地图
* [x] 界面参考 vscode，使用习惯和 vscode 几乎一致，但是更加轻巧简洁
* [x] 跨平台，下载版本只编译了 windows ，如需在 linux 和 mac 上运行，请自行编译

## 编译步骤

1. npm i electron -g
2. npm i electron-builder -g
3. 进入 my-editor 根目录，运行 npm run build，编译 render 部分
4. 进入 my-editor/electron 目录，运行 npm run build，编译成可执行文件，最终生成的安装包在 my-editor/electron/dist 目录下

## 主题预览
theme-monokai

![](https://wanls4583.github.io/images/code/my-editor-1.png)

theme-monokai-tranlucent

![](https://wanls4583.github.io/images/code/my-editor-2.png)

## 下载链接
[**`Download Realease`**](https://github.com/wanls4583/my-editor/releases/)

## 贡献
欢迎给出一些意见和优化，期待你的 `Pull Request`
