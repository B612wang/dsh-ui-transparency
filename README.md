# dsh-ui-transparency

把 DSH 窗口调成半透明。**只有这一个功能**：不改界面样式、不加面板、不遮挡内容、不碰其它任何功能。

## 用法

侧边栏底部（「设置」旁边）多一个 ◐ 按钮，点开是一条 0–90% 的滑块：

- 0% = 完全不透明（默认，和没装一样）
- 往上拖，整个窗口连同侧边栏一起变透明，能看到后面的桌面
- 数值存在浏览器本地，重开 DSH 自动恢复

想要铺满屏幕的透明效果，把窗口拉大即可（这不是它的职责，它只调透明度）。

## 适合谁

简洁党：装完只看得到一个 16px 的小按钮，面板点开是「滑块 + 百分比」，点开、调完、关掉，不留痕。

## 要求

- Windows（通过 Win32 分层窗口 `WS_EX_LAYERED` + `LWA_ALPHA` 实现整窗透明）
- 不需要管理员权限；不改动 DSH 安装目录里的任何文件

## 安装

```bash
dsh plugin add dsh-ui-transparency
```

本地开发时也可以直接装目录：

```bash
dsh plugin add E:\path\to\dsh-ui-transparency
```

装完重启一次 DSH（客户端半要重新加载）。

## 实现

- `index.js`（Host 半）：注册 `/dsh-ui-transparency/alpha` 路由，收到 0–255 的 alpha 后写给自己拉起的 `powershell.exe` 助手；助手空闲 5 分钟自动退出。
- `helper.ps1`：P/Invoke `SetLayeredWindowAttributes`，给 DSH 窗口加上 `WS_EX_LAYERED` 并设 alpha；alpha = 255 时清除该样式，完全还原成原窗口。
- `client.js`（Client 半）：侧边栏底部按钮 + 滑块，只发一个整数，不读写界面。

## License

MIT
