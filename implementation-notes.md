# dsh-browser-use 实施笔记

## 第一期：官方 Kimi WebBridge

浏览器控制默认走本机已安装的官方 `kimi-webbridge`，不自建桥，也不在插件里再做一套扩展。命令是 `POST http://127.0.0.1:<port>/command`，状态是 `GET /status`。地址只接受回环；插件可以 `start`，不会自动 `stop` / `restart` / `upgrade`。

设置左侧入口是「权限与控制」。只安装本插件时，首页是「自动操控」里的「外部浏览器」开关和「管理」。用户把开关从关到开时，设置页会立刻打开 `https://www.kimi.com/products/kimi-browser-extension`。

旧配置里的 CDP 调试地址、远程调试开关和有头/无头模式在读取时会被丢掉，连接固定为官方 WebBridge。`dsh-browser-computer-use` 还没有并入这一期。

本文记录阶段一侦察结论、与规格不一致时的取舍，以及仍需后续确认的事项。实现遵循现有 DeepSeek Harness 插件约定，不另起插件协议、配置系统、UI 框架或浏览器运行时。

## 现有协议（已核对）

- 插件是 Cordis bundle：`package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`，用 `insert` 追加一行。宿主入口是 `export function apply(ctx)` 与 `export const inject`。安装使用 `plugin_manager install_bundle`，不要手改 profile 的 `package.json`。
- 工具注册是 `ctx.tools.register({ name, description, parameters, execute })`。本仓库已安装插件把相关操作收成一个工具加 `action` 参数（`memory`、`browser`），而不是几十个点号工具名。
- 配置界面入口是 Client slot `settings.section`（设置左侧一项）。主题只用 `--dsw-alias-*`。可见文本按当前 locale 切换。不导入 `@deepseek-ai/dsh-client-ui-primitives`。
- 浏览器驱动：宿主 `browserUse` 服务只有 `register(name)`，用来独占一个 provider 名，没有页面或会话 API。当前 profile 里真正的浏览器能力是已安装的 `dsh-browser-computer-use`：本机 Chromium 的 Chrome DevTools Protocol。本插件复用同一条 CDP 通道和独立 profile 目录，不引入 Playwright。
- 人工授权的正式通道是 `ctx.approval.request`。唯一放行值是 `allowed-once`。没有打开的回合、或应答器不可用时会失败关闭。批准动作本身只能由用户发起。
- 持久化优先 `storageDomain` KV；服务不存在时退回 `$DSH_HOME/dsh-browser-use/` 下的文件。不往会话日志追加新的事件类型（新 `type` 会导致会话无法重新打开）。
- 测试约定与本仓库其他插件一致：`node --test`，不连接真实敏感站点。

## 规格适配

| 规格 | 落地 | 原因 |
| --- | --- | --- |
| 点号工具名 `browser.session.create` 等 | 单个工具 `browser_use`，`action` 使用同名字符串 | 对齐现有工具协议，避免把三十多个工具塞进模型上下文 |
| `browser.approval.respond` / `revoke` 作为工具 | 模型调用直接 `PERMISSION_DENIED`；只有设置页 RPC（用户）可以批准、拒绝、撤销 | Harness 规定授权类动作不能由代理执行 |
| `export const Config` | 不导出宿主 `Config` | 激活期 schema 类型未在现有插件中证实；错误的 `Config` 会让整行无法挂载。校验 schema 在插件内的 `config.js`，由设置页保存前执行 |
| TypeScript 严格模式 | 运行时代码为 ESM JavaScript | 已安装插件均由宿主直接加载 `.js`，没有插件级 `tsc` 流水线。引入第二套构建才会偏离现有约定 |
| 默认开启插件 | 工具会注册，但浏览器连接默认关闭，域名白名单默认空 | 空白名单拒绝一切导航；未连接时返回 `BROWSER_DISCONNECTED`。避免在用户看不见的情况下后台开浏览器 |
| L2「始终确认」、L3「禁止或强制确认」 | L2 只能是 `confirm`；L3 默认 `deny`，只允许改成 `confirm` | 不允许把 L2/L3 配成自动放行 |
| 保存密码 | 配置里即使传入 `true` 也会被强制改回 `false` | 密码持久化被规格禁止 |
| 截图脱敏 | 发现密码框、验证码或令牌字段时不返回图片字节，只返回已遮罩占位 | 运行时没有图像打码库；不落敏感截图比打码失败更安全 |
| ZIP 导出 | 无压缩存储的最小 ZIP（仅打包已脱敏 JSON） | 不新增压缩依赖 |

## 与现有浏览器插件的关系

`dsh-browser-computer-use` 继续占用工具名 `browser` 和设置项「浏览器」。本插件使用工具名 `browser_use`、设置项「浏览器自动化」，并在 `browserUse.register('dsh-browser-use')` 成功时成为唯一登记的 browser-use provider。两插件不要指向同一个调试端口，否则会互相抢同一个标签页。

## 仍需确认

1. 宿主是否计划提供官方 browser-use 会话 API。若提供，应把 WebBridge 驱动换成该服务。插件不再保存或使用 CDP 调试地址。
2. 插件级 TypeScript 构建若成为仓库标准，再把这些模块迁到严格模式源码；行为测试应保持不变。
3. 设置外壳目前不能为自定义分区声明图标，因此沿用本仓库「给导航按钮打标并替换图标」的做法。这是对设置外壳的补丁，不是第二套 UI 框架。
4. L1 默认是「始终确认」而不是自动放行，比规格示例更严。若产品希望普通点击默许，只改默认值，不要放宽 L2/L3。
5. 真实桌面浏览器上的点击、上传和下载仍需人工验收。自动化测试使用 mock 驱动和本地夹具，不访问外网。
6. CDP 驱动已实现状态、导航、快照、点击、输入、按键、滚动和返回。文件上传与下载在真实驱动上保持拒绝，避免页面指定路径后读取本机文件。截图字节不进入工具结果。

## 交付状态

- 已实现：策略、审批、会话、定位、审计、回放、设置页、本机配置文件、CDP 读取与点击。
- 受控占位：真实浏览器的文件上传、下载和截图像素。策略层会拦截，驱动层也不会落盘。
- 默认关闭：远程调试、Cookie 持久化、点击/输入/提交/上传/下载、跨域、弹窗。域名白名单默认为空。
- 需要批准：L1 默认确认；L2 始终确认；L3 默认拒绝。模型不能自己批准。
- 脱敏：密码、Token、Cookie、Authorization、卡号只保留“存在且已遮罩”。
- 未适配：Playwright，以及宿主将来可能提供的官方 browser-use 会话 API。
