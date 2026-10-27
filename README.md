# dsh-browser-use

受审计的浏览器自动化插件。Agent 通过一个 `browser_use` 工具创建会话、读取页面和执行动作。网页上的文字不能改写允许域名、能力或审批结论。

## 使用

1. 在设置左侧打开「权限与控制」。
2. 打开「外部浏览器」。开关打开时会自动打开 [Kimi 浏览器扩展安装页](https://www.kimi.com/products/kimi-browser-extension)，在 Chrome 或 Edge 里安装并启用扩展。
3. 插件只连接本机官方 Kimi WebBridge（默认 `127.0.0.1:10086`）。扩展未连接时不会操作网页。
4. 在「管理」里的「域名与能力」加入允许访问的域名。空白名单会拒绝所有导航。
5. 让 Agent 调用 `browser_use`。高风险动作会停在待批准列表，由你逐条批准。

不再提供 CDP 调试地址、远程调试开关或有头/无头运行模式。兼容别名是 `dsh-brower-use`。

## 默认关闭

点击、输入、选择、上传、下载、提交、跨域跳转、弹窗和 Cookie 持久化默认关闭。密码持久化永远关闭。

## 测试

```bash
node --test test/*.test.js
```

测试使用内存中的模拟浏览器和 `fixtures/site/` 夹具，不访问外网。
