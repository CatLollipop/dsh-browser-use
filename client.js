window.__ModuleLoader__.load({
  id: 'dsh-browser-use',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useMemo, useState } = React

    const BROWSER_MARKS = {
      chrome: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20viewBox%3D%220%200%2048%2048%22%20height%3D%2248%22%20width%3D%2248%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22a%22%20x1%3D%223.2173%22%20y1%3D%2215%22%20x2%3D%2244.7812%22%20y2%3D%2215%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23d93025%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23ea4335%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22b%22%20x1%3D%2220.7219%22%20y1%3D%2247.6791%22%20x2%3D%2241.5039%22%20y2%3D%2211.6837%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23fcc934%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23fbbc04%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22c%22%20x1%3D%2226.5981%22%20y1%3D%2246.5015%22%20x2%3D%225.8161%22%20y2%3D%2210.506%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%231e8e3e%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2334a853%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Ccircle%20cx%3D%2224%22%20cy%3D%2223.9947%22%20r%3D%2212%22%20style%3D%22fill%3A%23fff%22%2F%3E%3Cpath%20d%3D%22M3.2154%2C36A24%2C24%2C0%2C1%2C0%2C12%2C3.2154%2C24%2C24%2C0%2C0%2C0%2C3.2154%2C36ZM34.3923%2C18A12%2C12%2C0%2C1%2C1%2C18%2C13.6077%2C12%2C12%2C0%2C0%2C1%2C34.3923%2C18Z%22%20style%3D%22fill%3Anone%22%2F%3E%3Cpath%20d%3D%22M24%2C12H44.7812a23.9939%2C23.9939%2C0%2C0%2C0-41.5639.0029L13.6079%2C30l.0093-.0024A11.9852%2C11.9852%2C0%2C0%2C1%2C24%2C12Z%22%20style%3D%22fill%3Aurl(%23a)%22%2F%3E%3Ccircle%20cx%3D%2224%22%20cy%3D%2224%22%20r%3D%229.5%22%20style%3D%22fill%3A%231a73e8%22%2F%3E%3Cpath%20d%3D%22M34.3913%2C30.0029%2C24.0007%2C48A23.994%2C23.994%2C0%2C0%2C0%2C44.78%2C12.0031H23.9989l-.0025.0093A11.985%2C11.985%2C0%2C0%2C1%2C34.3913%2C30.0029Z%22%20style%3D%22fill%3Aurl(%23b)%22%2F%3E%3Cpath%20d%3D%22M13.6086%2C30.0031%2C3.218%2C12.006A23.994%2C23.994%2C0%2C0%2C0%2C24.0025%2C48L34.3931%2C30.0029l-.0067-.0068a11.9852%2C11.9852%2C0%2C0%2C1-20.7778.007Z%22%20style%3D%22fill%3Aurl(%23c)%22%2F%3E%3C%2Fsvg%3E",
      edge: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20256%20256%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22b%22%20cx%3D%22161.8%22%20cy%3D%2268.9%22%20r%3D%2295.4%22%20gradientTransform%3D%22matrix(1%200%200%20-.95%200%20248.8)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%22.7%22%20stop-opacity%3D%220%22%2F%3E%3Cstop%20offset%3D%22.9%22%20stop-opacity%3D%22.5%22%2F%3E%3Cstop%20offset%3D%221%22%2F%3E%3C%2FradialGradient%3E%3CradialGradient%20id%3D%22d%22%20cx%3D%22-340.3%22%20cy%3D%2263%22%20r%3D%22143.2%22%20gradientTransform%3D%22matrix(.15%20-.99%20-.8%20-.12%20176.6%20-125.4)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%22.8%22%20stop-opacity%3D%220%22%2F%3E%3Cstop%20offset%3D%22.9%22%20stop-opacity%3D%22.5%22%2F%3E%3Cstop%20offset%3D%221%22%2F%3E%3C%2FradialGradient%3E%3CradialGradient%20id%3D%22e%22%20cx%3D%22113.4%22%20cy%3D%22570.2%22%20r%3D%22202.4%22%20gradientTransform%3D%22matrix(-.04%201%202.13%20.08%20-1179.5%20-106.7)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%2335c1f1%22%2F%3E%3Cstop%20offset%3D%22.1%22%20stop-color%3D%22%2334c1ed%22%2F%3E%3Cstop%20offset%3D%22.2%22%20stop-color%3D%22%232fc2df%22%2F%3E%3Cstop%20offset%3D%22.3%22%20stop-color%3D%22%232bc3d2%22%2F%3E%3Cstop%20offset%3D%22.7%22%20stop-color%3D%22%2336c752%22%2F%3E%3C%2FradialGradient%3E%3CradialGradient%20id%3D%22f%22%20cx%3D%22376.5%22%20cy%3D%22568%22%20r%3D%2297.3%22%20gradientTransform%3D%22matrix(.28%20.96%20.78%20-.23%20-303.8%20-148.5)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%2366eb6e%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2366eb6e%22%20stop-opacity%3D%220%22%2F%3E%3C%2FradialGradient%3E%3ClinearGradient%20id%3D%22a%22%20x1%3D%2263.3%22%20y1%3D%2284%22%20x2%3D%22241.7%22%20y2%3D%2284%22%20gradientTransform%3D%22matrix(1%200%200%20-1%200%20266)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%230c59a4%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23114a8b%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22c%22%20x1%3D%22157.3%22%20y1%3D%22161.4%22%20x2%3D%2246%22%20y2%3D%2240.1%22%20gradientTransform%3D%22matrix(1%200%200%20-1%200%20266)%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%231b9de2%22%2F%3E%3Cstop%20offset%3D%22.2%22%20stop-color%3D%22%231595df%22%2F%3E%3Cstop%20offset%3D%22.7%22%20stop-color%3D%22%230680d7%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%230078d4%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D%22M235.7%20195.5a93.7%2093.7%200%200%201-10.6%204.7%20101.9%20101.9%200%200%201-35.9%206.4c-47.3%200-88.5-32.5-88.5-74.3a31.5%2031.5%200%200%201%2016.4-27.3c-42.8%201.8-53.8%2046.4-53.8%2072.5%200%2074%2068.1%2081.4%2082.8%2081.4%207.9%200%2019.8-2.3%2027-4.6l1.3-.4a128.3%20128.3%200%200%200%2066.6-52.8%204%204%200%200%200-5.3-5.6Z%22%20transform%3D%22translate(-4.6%20-5)%22%20style%3D%22fill%3Aurl(%23a)%22%2F%3E%3Cpath%20d%3D%22M235.7%20195.5a93.7%2093.7%200%200%201-10.6%204.7%20101.9%20101.9%200%200%201-35.9%206.4c-47.3%200-88.5-32.5-88.5-74.3a31.5%2031.5%200%200%201%2016.4-27.3c-42.8%201.8-53.8%2046.4-53.8%2072.5%200%2074%2068.1%2081.4%2082.8%2081.4%207.9%200%2019.8-2.3%2027-4.6l1.3-.4a128.3%20128.3%200%200%200%2066.6-52.8%204%204%200%200%200-5.3-5.6Z%22%20transform%3D%22translate(-4.6%20-5)%22%20style%3D%22isolation%3Aisolate%3Bopacity%3A.35%3Bfill%3Aurl(%23b)%22%2F%3E%3Cpath%20d%3D%22M110.3%20246.3A79.2%2079.2%200%200%201%2087.6%20225a80.7%2080.7%200%200%201%2029.5-120c3.2-1.5%208.5-4.1%2015.6-4a32.4%2032.4%200%200%201%2025.7%2013%2031.9%2031.9%200%200%201%206.3%2018.7c0-.2%2024.5-79.6-80-79.6-43.9%200-80%2041.6-80%2078.2a130.2%20130.2%200%200%200%2012.1%2056%20128%20128%200%200%200%20156.4%2067%2075.5%2075.5%200%200%201-62.8-8Z%22%20transform%3D%22translate(-4.6%20-5)%22%20style%3D%22fill%3Aurl(%23c)%22%2F%3E%3Cpath%20d%3D%22M110.3%20246.3A79.2%2079.2%200%200%201%2087.6%20225a80.7%2080.7%200%200%201%2029.5-120c3.2-1.5%208.5-4.1%2015.6-4a32.4%2032.4%200%200%201%2025.7%2013%2031.9%2031.9%200%200%201%206.3%2018.7c0-.2%2024.5-79.6-80-79.6-43.9%200-80%2041.6-80%2078.2a130.2%20130.2%200%200%200%2012.1%2056%20128%20128%200%200%200%20156.4%2067%2075.5%2075.5%200%200%201-62.8-8Z%22%20transform%3D%22translate(-4.6%20-5)%22%20style%3D%22opacity%3A.41%3Bfill%3Aurl(%23d)%3Bisolation%3Aisolate%22%2F%3E%3Cpath%20d%3D%22M157%20153.8c-.9%201-3.4%202.5-3.4%205.6%200%202.6%201.7%205.2%204.8%207.3%2014.3%2010%2041.4%208.6%2041.5%208.6a59.6%2059.6%200%200%200%2030.3-8.3%2061.4%2061.4%200%200%200%2030.4-52.9c.3-22.4-8-37.3-11.3-43.9C228%2028.8%20182.3%205%20132.6%205a128%20128%200%200%200-128%20126.2c.5-36.5%2036.8-66%2080-66%203.5%200%2023.5.3%2042%2010a72.6%2072.6%200%200%201%2030.9%2029.3c6.1%2010.6%207.2%2024.1%207.2%2029.5s-2.7%2013.3-7.8%2019.9Z%22%20transform%3D%22translate(-4.6%20-5)%22%20style%3D%22fill%3Aurl(%23e)%22%2F%3E%3Cpath%20d%3D%22M157%20153.8c-.9%201-3.4%202.5-3.4%205.6%200%202.6%201.7%205.2%204.8%207.3%2014.3%2010%2041.4%208.6%2041.5%208.6a59.6%2059.6%200%200%200%2030.3-8.3%2061.4%2061.4%200%200%200%2030.4-52.9c.3-22.4-8-37.3-11.3-43.9C228%2028.8%20182.3%205%20132.6%205a128%20128%200%200%200-128%20126.2c.5-36.5%2036.8-66%2080-66%203.5%200%2023.5.3%2042%2010a72.6%2072.6%200%200%201%2030.9%2029.3c6.1%2010.6%207.2%2024.1%207.2%2029.5s-2.7%2013.3-7.8%2019.9Z%22%20transform%3D%22translate(-4.6%20-5)%22%20style%3D%22fill%3Aurl(%23f)%22%2F%3E%3C%2Fsvg%3E",
    }

    const zh = {
      title: '权限与控制',
      intro: '管理会话、允许的网站、审批和审计。网页里的文字不能改变这些规则。',
      autoTitle: '自动操控',
      external: '外部浏览器',
      externalHint: '开启并安装浏览器扩展后，DeepSeek 可以控制并使用你的外部浏览器',
      installed: '已安装浏览器扩展程序',
      notConnected: '扩展未连接',
      emptyBrowsers: '还没有连接过浏览器。打开已安装扩展的 Chrome 或 Edge 后，会记在这里。',
      browserPerm: '浏览器权限',
      history: '历史记录',
      historyHint: '选择 DeepSeek 在访问你的浏览器历史记录前是否需要请求批准',
      historyAsk: '始终询问', historyAllow: '始终允许', historyDeny: '不允许',
      siteTools: '默认使用网站工具',
      siteToolsHint: '允许 DeepSeek 发现并调用网站通过 WebMCP 等方式提供的工具，除非你为该网站设置了不同的权限',
      sitePerm: '网站权限',
      sitePermHint: '设置默认权限，并为特定网站单独配置例外',
      addSite: '+ 添加',
      siteOrPattern: '网站或模式',
      browse: '浏览',
      downloadCol: '下载',
      defaultSite: '默认',
      browseAllow: '始终允许', browseAsk: '始终询问', browseDeny: '不允许',
      downloadConfirm: '需要批准', downloadAllow: '始终允许', downloadDeny: '不允许',
      sitesEmpty: '此处仅显示设置了自定义权限的网站',
      siteHost: '域名',
      developer: '开发者模式',
      riskUp: '风险升高',
      cdpTitle: '启用完整 CDP 访问权限',
      cdpHint: '允许 DeepSeek 在已连接的浏览器会话中使用完整的 Chrome DevTools Protocol 访问权限。完整 CDP 访问权限可让 DeepSeek 检查并控制敏感的浏览器内部功能，可能使你的数据面临风险。',
      manage: '管理',
      back: '返回',
      installOpened: '已打开 Kimi 浏览器扩展安装页。请在 Chrome 或 Edge 中完成安装。',
      installBlocked: '浏览器拦截了安装页。请允许弹窗，或手动打开 ',
      detect: '重新检测',
      openInstall: '打开安装页',
      daemonOn: '本地服务已运行',
      daemonOff: '本地服务未运行',
      extOn: '扩展已连接',
      extOff: '扩展未连接',
      loading: '正在读取配置…',
      unavailable: '无法连接宿主，请刷新页面。',
      dirty: '有未保存的修改',
      save: '保存',
      saving: '正在保存…',
      saved: '已保存。',
      invalid: '请先修正标红的字段。',
      reset: '恢复默认',
      export: '导出 JSON',
      import: '导入',
      navBasic: '基础设置',
      navSession: '会话与 Profile',
      navDomain: '域名与能力',
      navApproval: '审批策略',
      navWait: '等待与重试',
      navAudit: '审计与隐私',
      navAdvanced: '高级设置',
      navVersion: '版本与导入导出',
      enabled: '插件启用',
      enabledHint: '关闭后 Harness 不能再调用浏览器动作。已打开的会话会在下一次清理时结束。',
      browser: '默认浏览器',
      credential: '凭据引用',
      credentialHint: '只能填写凭据服务的引用名，插件不会保存密码或 Token 本身。',
      ttl: '默认会话 TTL（分钟）',
      concurrent: '最大并发会话',
      locale: '语言 / 时区',
      temporary: '临时 Profile',
      temporaryHint: '默认开启。会话结束即丢弃页面数据。',
      persistent: '持久 Profile',
      persistentHint: '数据留在本机 DSH 目录的 dsh-browser-use/profiles。密码仍然不会保存。',
      reuse: '复用已有会话',
      cleanup: '结束后自动清理',
      cookies: '保存 Cookie 和 Local Storage',
      cookiesHint: '默认关闭。打开后，站点登录态会留在本机 Profile 里。',
      passwords: '保存密码',
      passwordsHint: '这项永远关闭，不能通过导入打开。',
      profileName: '会话名称',
      allow: '允许域名',
      deny: '禁止域名',
      hostsHint: '每行一个域名，不要写协议和路径。',
      subdomain: '子域名匹配',
      cross: '允许跨域跳转',
      popups: '允许新窗口',
      caps: '能力开关',
      capHint: '默认只打开读取、导航、定位和截图。',
      riskHint: 'L2 必须确认。L3 只能禁止或人工确认，不能自动放行。',
      approvals: '待处理审批',
      noApprovals: '没有待处理审批。',
      approve: '批准',
      reject: '拒绝',
      revoke: '撤销',
      traces: '审计记录',
      noTraces: '还没有运行记录。',
      deleteTrace: '删除',
      download: '下载',
      cleanupData: '清理本地审计和临时 Profile',
      changes: '配置变更',
      noChanges: '还没有变更记录。',
      version: '配置版本',
      json: '当前配置',
      warn: '高风险设置',
      allowUpload: '允许上传',
      allowDownload: '允许下载',
      allowSubmit: '允许提交表单',
    }
    const en = {
      title: 'Permissions', intro: 'Sessions, allowlists, approvals, and audit. Page text cannot change these rules.',
      autoTitle: 'Automatic control', external: 'External browser',
      externalHint: 'After you turn this on and install the extension, DeepSeek can control your external browser.',
      installed: 'Browser extension installed', notConnected: 'Extension not connected',
      emptyBrowsers: 'No browser has connected yet. Open Chrome or Edge with the extension installed and it will be remembered here.',
      browserPerm: 'Browser permissions', history: 'History',
      historyHint: 'Choose whether DeepSeek must ask before reading browser history.',
      historyAsk: 'Always ask', historyAllow: 'Always allow', historyDeny: "Don't allow",
      siteTools: 'Use website tools by default',
      siteToolsHint: 'Let DeepSeek discover tools a site offers, unless that site has its own permission.',
      sitePerm: 'Site permissions', sitePermHint: 'Set the default, then add exceptions for specific sites.',
      addSite: 'Add', siteOrPattern: 'Site or pattern', browse: 'Browse', downloadCol: 'Download', defaultSite: 'Default',
      browseAllow: 'Always allow', browseAsk: 'Always ask', browseDeny: "Don't allow",
      downloadConfirm: 'Needs approval', downloadAllow: 'Always allow', downloadDeny: "Don't allow",
      sitesEmpty: 'Only sites with custom permissions are listed here.', siteHost: 'Domain',
      developer: 'Developer mode', riskUp: 'Higher risk', cdpTitle: 'Enable full CDP access',
      cdpHint: 'Lets DeepSeek use the full Chrome DevTools Protocol in a connected browser session. This can expose sensitive browser internals.',
      manage: 'Manage', back: 'Back',
      installOpened: 'Opened the Kimi browser extension install page. Finish it in Chrome or Edge.',
      installBlocked: 'The browser blocked the install page. Allow popups, or open ',
      detect: 'Check again', openInstall: 'Open install page',
      daemonOn: 'Local service running', daemonOff: 'Local service stopped',
      extOn: 'Extension connected', extOff: 'Extension not connected',
      loading: 'Loading…', unavailable: 'Cannot reach the host. Refresh the page.', dirty: 'Unsaved changes',
      save: 'Save', saving: 'Saving…', saved: 'Saved.', invalid: 'Fix the highlighted fields first.', reset: 'Restore defaults',
      export: 'Export JSON', import: 'Import', navBasic: 'Basics', navSession: 'Sessions', navDomain: 'Sites',
      navApproval: 'Approvals', navWait: 'Wait & retry', navAudit: 'Audit', navAdvanced: 'Advanced', navVersion: 'Version',
      enabled: 'Plugin enabled', enabledHint: 'When off, Harness cannot call browser actions.', browser: 'Browser',
      credential: 'Credential reference', credentialHint: 'A reference name only. Passwords and tokens are not stored.',
      ttl: 'Session TTL (minutes)', concurrent: 'Max sessions', locale: 'Locale', temporary: 'Temporary profile',
      temporaryHint: 'On by default. Page data is discarded when the session ends.', persistent: 'Persistent profile',
      persistentHint: 'Data stays under the local dsh-browser-use profiles directory. Passwords are still never stored.',
      reuse: 'Reuse sessions', cleanup: 'Clean up on close', cookies: 'Persist cookies', cookiesHint: 'Off by default. Login state would remain on this machine.',
      passwords: 'Persist passwords', passwordsHint: 'Always off. Import cannot turn it on.', profileName: 'Profile name',
      allow: 'Allowlist', deny: 'Denylist', hostsHint: 'One domain per line.', subdomain: 'Subdomain match',
      cross: 'Allow cross-origin', popups: 'Allow popups', caps: 'Capabilities', capHint: 'Read, navigate, locate, and screenshot are on by default.',
      riskHint: 'L2 always confirms. L3 can only be denied or manually confirmed.', approvals: 'Pending approvals',
      noApprovals: 'No pending approvals.', approve: 'Approve', reject: 'Reject', revoke: 'Revoke', traces: 'Audit',
      noTraces: 'No runs yet.', deleteTrace: 'Delete', download: 'Download', cleanupData: 'Clear local audit and temporary profiles',
      changes: 'Changes', noChanges: 'No changes yet.', version: 'Config version', json: 'Current config', warn: 'Higher risk',
      allowUpload: 'Allow upload', allowDownload: 'Allow download', allowSubmit: 'Allow submit',
    }

    function t(ctx, key) {
      let active = 'en'
      try { active = String(ctx.locale?.getSnapshot?.()?.active || 'en') } catch { /* 使用英文兜底 */ }
      const dict = active.toLowerCase().startsWith('zh') ? zh : en
      return dict[key] || zh[key] || key
    }

    const NAV = [
      ['basic', 'navBasic'], ['session', 'navSession'], ['domain', 'navDomain'], ['approval', 'navApproval'],
      ['wait', 'navWait'], ['audit', 'navAudit'], ['advanced', 'navAdvanced'], ['version', 'navVersion'],
    ]
    const CAPS = ['read', 'navigate', 'locate', 'screenshot', 'click', 'type', 'select', 'upload', 'download', 'submit', 'external', 'mutateBusiness']

    function bindIcon(id, labels, svg) {
      if (typeof document === 'undefined') return () => {}
      const styleId = `dsh-settings-nav-icon-${id}`
      const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
      let style = document.getElementById(styleId)
      if (!style) {
        style = document.createElement('style')
        style.id = styleId
        document.head.appendChild(style)
      }
      style.textContent = `[data-shortcut-modal="settings"] nav button[data-dsh-plugin-nav="${id}"]>svg{width:0!important;height:0!important;margin:0!important;overflow:hidden;position:absolute;pointer-events:none}[data-shortcut-modal="settings"] nav button[data-dsh-plugin-nav="${id}"]::before{content:"";width:16px;height:16px;flex:none;border-radius:4px;background:url("${url}") center/16px 16px no-repeat}`
      const wanted = new Set(labels)
      let navObserver
      const mark = () => {
        const nav = document.querySelector('[data-shortcut-modal="settings"] nav')
        if (!nav) { navObserver?.disconnect(); navObserver = undefined; return }
        if (!navObserver) {
          navObserver = new MutationObserver(mark)
          navObserver.observe(nav, { childList: true, subtree: true, characterData: true })
        }
        for (const button of nav.querySelectorAll('button')) {
          const text = (button.querySelector('span')?.textContent || '').trim()
          if (wanted.has(text)) button.setAttribute('data-dsh-plugin-nav', id)
          else if (button.getAttribute('data-dsh-plugin-nav') === id) button.removeAttribute('data-dsh-plugin-nav')
        }
      }
      const rootObserver = new MutationObserver(mark)
      rootObserver.observe(document.body, { childList: true })
      mark()
      return () => { rootObserver.disconnect(); navObserver?.disconnect(); style.remove() }
    }

    function unwrapRpc(reply) {
      if (!reply || typeof reply !== 'object') return reply
      if (reply.ok === true && Object.hasOwn(reply, 'value')) return reply.value
      if ('value' in reply && !('ok' in reply)) return reply.value
      if (reply.result && typeof reply.result === 'object') return unwrapRpc(reply.result)
      return reply
    }

    async function callRpc(ctx, payload) {
      const rpc = ctx.connection?.rpc
      if (!rpc?.call) throw new Error(t(ctx, 'unavailable'))
      const reply = await Promise.race([
        rpc.call('/api', 'dsh-browser-use', payload),
        new Promise((_, reject) => setTimeout(() => reject(new Error(t(ctx, 'unavailable'))), 8000)),
      ])
      const body = unwrapRpc(reply)
      if (body?.ok === false && body.errors) return body
      if (body?.ok === false) throw new Error(body.message || body.error?.message || t(ctx, 'invalid'))
      return body
    }

    function configFrom(body) {
      if (body?.config && typeof body.config === 'object') return body.config
      if (body?.connection && typeof body.connection === 'object') return body
      return null
    }

    function Page({ ctx }) {
      const [section, setSection] = useState('basic')
      const [draft, setDraft] = useState(null)
      const [saved, setSaved] = useState('')
      const [changes, setChanges] = useState([])
      const [errors, setErrors] = useState([])
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState(false)
      const [approvals, setApprovals] = useState([])
      const [traces, setTraces] = useState([])
      const [panel, setPanel] = useState('control')
      const [browserId, setBrowserId] = useState('')
      const [siteHost, setSiteHost] = useState('')
      const [bridge, setBridge] = useState(null)
      const installPage = 'https://www.kimi.com/products/kimi-browser-extension'
      const label = (key) => t(ctx, key)
      const dirty = draft ? JSON.stringify(draft) !== saved : false

      async function load() {
        const body = await callRpc(ctx, { action: 'config.get' })
        const config = configFrom(body)
        if (!config) throw new Error(label('unavailable'))
        setDraft(config)
        setSaved(JSON.stringify(config))
        setChanges(body?.changes || [])
        const listed = await callRpc(ctx, { action: 'browser.approval.list' }).catch(() => null)
        if (listed) setApprovals(listed.approvals || [])
        const runs = await callRpc(ctx, { action: 'browser.trace.list' }).catch(() => null)
        if (runs) setTraces(runs.traces || runs.runs || [])
        const link = await callRpc(ctx, { action: 'webbridge.status' }).catch(() => null)
        if (link?.config) {
          setDraft(link.config)
          setSaved(JSON.stringify(link.config))
        }
        if (link?.status || link?.browsers) setBridge({ ...(link.status || {}), browsers: link.browsers || [] })
      }

      function browserRows() {
        const saved = draft?.browsers || []
        const live = bridge?.browsers || []
        const ids = []
        for (const item of [...saved, ...live]) if (item?.id && !ids.includes(item.id)) ids.push(item.id)
        return ids.map((id) => {
          const base = saved.find((item) => item.id === id) || live.find((item) => item.id === id)
          const current = live.find((item) => item.id === id)
          return {
            ...base,
            name: base.name || (id === 'edge' ? 'Microsoft Edge' : 'Google Chrome'),
            connected: current?.connected === true,
          }
        })
      }

      function updateBrowser(id, change) {
        setDraft((current) => ({
          ...current,
          browsers: (current.browsers || []).map((item) => item.id === id ? change(item) : item),
        }))
      }

      function openInstall() {
        const opened = window.open(installPage, '_blank', 'noopener,noreferrer')
        setNotice(opened ? label('installOpened') : `${label('installBlocked')}${installPage}`)
        return Boolean(opened)
      }

      async function setBrowserEnabled(id, next) {
        const row = browserRows().find((item) => item.id === id)
        const opened = next && row && !row.connected ? openInstall() : false
        const browsers = (draft.browsers || []).some((item) => item.id === id)
          ? draft.browsers.map((item) => item.id === id ? { ...item, enabled: next } : item)
          : [...(draft.browsers || []), { ...row, enabled: next }]
        const config = {
          ...draft,
          browsers: browsers.map(({ connected, ...item }) => item),
          connection: { ...(draft.connection || {}), mode: 'webbridge', extensionEnabled: browsers.some((item) => item.enabled) },
        }
        setBusy(true)
        try {
          const result = await callRpc(ctx, { action: config.connection.extensionEnabled ? 'webbridge.enable' : 'webbridge.disable', config })
          if (result?.ok === false) { setErrors(result.errors || [result.message || label('invalid')]); return }
          if (result?.config) {
            setDraft(result.config)
            setSaved(JSON.stringify(result.config))
          }
          if (result?.browsers) setBridge({ ...(result.status || {}), browsers: result.browsers })
          if (opened) setNotice(label('installOpened'))
        } catch (error) { setNotice(error.message) } finally { setBusy(false) }
      }

      useEffect(() => { load().catch((error) => setNotice(error.message)) }, [])

      function patch(path, value) {
        setDraft((current) => {
          const next = structuredClone(current)
          const parts = path.split('.')
          let cursor = next
          for (const part of parts.slice(0, -1)) cursor = cursor[part]
          cursor[parts.at(-1)] = value
          return next
        })
      }

      function choose(next) {
        if (dirty && !window.confirm(label('dirty'))) return
        setSection(next)
      }

      async function save() {
        setBusy(true)
        setErrors([])
        try {
          const checked = await callRpc(ctx, { action: 'config.validate', config: draft })
          if (checked?.ok === false) { setErrors(checked.errors || [label('invalid')]); return }
          const result = await callRpc(ctx, { action: 'config.save', config: checked.config || draft })
          if (result?.ok === false) { setErrors(result.errors || [label('invalid')]); return }
          setDraft(result.config)
          setSaved(JSON.stringify(result.config))
          setNotice(label('saved'))
          await load()
        } catch (error) { setNotice(error.message) } finally { setBusy(false) }
      }

      async function reset() {
        const result = await callRpc(ctx, { action: 'config.reset' })
        setDraft(result.config)
        setSaved(JSON.stringify(result.config))
        setNotice(label('saved'))
      }

      function exportJson() {
        const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'dsh-browser-use-config.json'
        link.click()
        URL.revokeObjectURL(link.href)
      }

      async function importJson(file) {
        const text = await file.text()
        const result = await callRpc(ctx, { action: 'config.import', config: JSON.parse(text) })
        if (result?.ok === false) { setErrors(result.errors || []); return }
        setDraft(result.config)
        setSaved(JSON.stringify(result.config))
        setNotice(label('saved'))
      }

      async function respond(approvalId, decision) {
        await callRpc(ctx, { action: decision === 'revoked' ? 'browser.approval.revoke' : 'browser.approval.respond', approvalId, decision: decision === 'revoked' ? undefined : decision })
        await load()
      }

      const selected = (draft?.browsers || []).find((item) => item.id === browserId)
      if (panel === 'permissions' && selected) return permissionsPage(selected)
      if (panel === 'control' || !draft) {
        const rows = browserRows()
        return h('div', { className: 'bu-page' },
          h('style', null, CSS),
          h('p', { className: 'bu-kicker' }, label('autoTitle')),
          h('section', { className: 'bu-auto' },
            rows.length ? rows.map((item) => h('div', { className: 'bu-browser', key: item.id },
              browserMark(item.id),
              h('div', { className: 'bu-ext-copy' },
                h('strong', null, item.name),
                h('p', { className: 'bu-status' }, h('i', { className: item.connected ? 'is-on' : '' }), item.connected ? label('installed') : label('notConnected'))),
              h('button', { type: 'button', className: 'bu-manage', onClick: () => { setBrowserId(item.id); setPanel('permissions') } }, label('manage')),
              toggle(item.enabled === true, (value) => { if (draft) setBrowserEnabled(item.id, value) }, item.name)))
              : h('p', { className: 'bu-empty' }, label('emptyBrowsers'))),
          !draft ? h('p', { className: 'bu-help' }, notice || label('loading')) : null,
          notice && draft ? h('p', { className: 'bu-help', role: 'status' }, notice) : null,
          errors.length ? h('ul', { className: 'bu-errors', role: 'alert' }, errors.map((item) => h('li', { key: item }, item))) : null)
      }

      function permissionsPage(item) {
        const historyOptions = [['ask', label('historyAsk')], ['allow', label('historyAllow')], ['deny', label('historyDeny')]]
        const browseOptions = [['allow', label('browseAllow')], ['ask', label('browseAsk')], ['deny', label('browseDeny')]]
        const downloadOptions = [['confirm', label('downloadConfirm')], ['allow', label('downloadAllow')], ['deny', label('downloadDeny')]]
        return h('div', { className: 'bu-page bu-perm' },
          h('style', null, CSS),
          h('header', { className: 'bu-perm-head' },
            h('button', { type: 'button', className: 'bu-back', onClick: () => setPanel('control'), 'aria-label': label('back') }, '‹'),
            browserMark(item.id),
            h('h1', null, item.name)),
          h('section', { className: 'bu-block' },
            h('h2', null, label('browserPerm')),
            h('div', { className: 'bu-sheet' },
              h('div', { className: 'bu-line' },
                h('div', { className: 'bu-copy' }, h('strong', null, label('history')), h('p', null, label('historyHint'))),
                labeledSelect(item.history, historyOptions, (value) => updateBrowser(item.id, (row) => ({ ...row, history: value })), label('history'))),
              h('div', { className: 'bu-line' },
                h('div', { className: 'bu-copy' }, h('strong', null, label('siteTools')), h('p', null, label('siteToolsHint'))),
                toggle(item.siteTools === true, (value) => updateBrowser(item.id, (row) => ({ ...row, siteTools: value })), label('siteTools'))))),
          h('section', { className: 'bu-block' },
            h('div', { className: 'bu-block-head' },
              h('div', null, h('h2', null, label('sitePerm')), h('p', null, label('sitePermHint'))),
              h('div', { className: 'bu-add' },
                h('input', { className: 'bu-input', value: siteHost, placeholder: label('siteHost'), 'aria-label': label('siteHost'), onChange: (event) => setSiteHost(event.target.value) }),
                h('button', { type: 'button', className: 'bu-add-btn', disabled: !siteHost.trim(), onClick: () => addSite(item.id) }, label('addSite')))),
            h('div', { className: 'bu-sheet' },
              h('div', { className: 'bu-table-head' }, h('span', null, label('siteOrPattern')), h('span', null, label('browse')), h('span', null, label('downloadCol'))),
              h('div', { className: 'bu-table-row' },
                h('strong', null, label('defaultSite')),
                labeledSelect(item.browse, browseOptions, (value) => updateBrowser(item.id, (row) => ({ ...row, browse: value })), label('browse')),
                labeledSelect(item.download, downloadOptions, (value) => updateBrowser(item.id, (row) => ({ ...row, download: value })), label('downloadCol'))),
              ...(item.sites || []).map((site) => h('div', { className: 'bu-table-row', key: site.host },
                h('span', null, site.host),
                labeledSelect(site.browse, browseOptions, (value) => updateBrowser(item.id, (row) => ({ ...row, sites: row.sites.map((entry) => entry.host === site.host ? { ...entry, browse: value } : entry) })), site.host),
                labeledSelect(site.download, downloadOptions, (value) => updateBrowser(item.id, (row) => ({ ...row, sites: row.sites.map((entry) => entry.host === site.host ? { ...entry, download: value } : entry) })), site.host))),
              h('p', { className: 'bu-help bu-sites-note' }, label('sitesEmpty')))),
          h('section', { className: 'bu-block' },
            h('h2', null, label('developer')),
            h('div', { className: 'bu-sheet bu-risk' },
              h('p', { className: 'bu-risk-title' }, label('riskUp')),
              h('div', { className: 'bu-line' },
                h('div', { className: 'bu-copy' }, h('strong', null, label('cdpTitle')), h('p', null, label('cdpHint'))),
                toggle(item.developerCdp === true, (value) => updateBrowser(item.id, (row) => ({ ...row, developerCdp: value })), label('cdpTitle'))))),
          h('div', { className: 'bu-actions bu-save' },
            h('button', { type: 'button', className: 'bu-primary', disabled: busy || !dirty, onClick: save }, busy ? label('saving') : label('save'))),
          notice ? h('p', { className: 'bu-help', role: 'status' }, notice) : null,
          errors.length ? h('ul', { className: 'bu-errors', role: 'alert' }, errors.map((entry) => h('li', { key: entry }, entry))) : null)
      }

      function addSite(id) {
        const host = siteHost.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
        if (!host || host.includes(' ')) return
        updateBrowser(id, (row) => ({ ...row, sites: [...(row.sites || []).filter((site) => site.host !== host), { host, browse: row.browse, download: row.download }] }))
        setSiteHost('')
      }
      return h('div', { className: 'bu-page' },
        h('style', null, CSS),
        h('div', { className: 'bu-layout' },
          h('nav', { className: 'bu-nav', 'aria-label': label('title') }, NAV.map(([id, key]) => h('button', {
            key: id, type: 'button', className: section === id ? 'is-active' : '', onClick: () => choose(id),
          }, label(key)))),
          h('div', { className: 'bu-main' },
            h('header', { className: 'bu-head' },
              h('button', { type: 'button', onClick: () => setPanel('control') }, label('back')),
              h('h1', null, label('autoTitle')),
              h('p', null, label('intro')),
              h('p', { className: 'bu-help' }, bridge ? `${bridge.running ? label('daemonOn') : label('daemonOff')} · ${bridge.extension_connected ? label('extOn') : label('extOff')} · ${bridge.addr || ''}` : ''),
              h('div', { className: 'bu-actions' },
                h('button', { type: 'button', onClick: () => callRpc(ctx, { action: 'webbridge.status' }).then((link) => setBridge(link.status)).catch((error) => setNotice(error.message)) }, label('detect')),
                h('button', { type: 'button', onClick: openInstall }, label('openInstall')))),
            dirty ? h('p', { className: 'bu-dirty', role: 'status' }, label('dirty')) : null,
            errors.length ? h('ul', { className: 'bu-errors', role: 'alert' }, errors.map((item) => h('li', { key: item }, item))) : null,
            notice ? h('p', { className: 'bu-help', role: 'status' }, notice) : null,
            section === 'basic' ? basic(draft, patch, label) : null,
            section === 'session' ? session(draft, patch, label) : null,
            section === 'domain' ? domain(draft, patch, label) : null,
            section === 'approval' ? approval(draft, patch, label, approvals, respond) : null,
            section === 'wait' ? wait(draft, patch, label) : null,
            section === 'audit' ? audit(draft, patch, label, traces, ctx) : null,
            section === 'advanced' ? advanced(draft, patch, label) : null,
            section === 'version' ? version(draft, label, changes) : null,
            h('div', { className: 'bu-actions' },
              h('button', { type: 'button', className: 'bu-primary', disabled: busy || !dirty, onClick: save }, busy ? label('saving') : label('save')),
              h('button', { type: 'button', onClick: reset }, label('reset')),
              h('button', { type: 'button', onClick: exportJson }, label('export')),
              h('label', { className: 'bu-file' }, label('import'), h('input', { type: 'file', accept: 'application/json', onChange: (event) => { const file = event.target.files?.[0]; if (file) importJson(file).catch((error) => setNotice(error.message)) } }))))))
    }

    function browserMark(id) {
      return h('img', { className: 'bu-mark', alt: '', src: BROWSER_MARKS[id] || BROWSER_MARKS.chrome })
    }

    function labeledSelect(value, options, onChange, name) {
      return h('select', { className: 'bu-select', value: value || options[0][0], 'aria-label': name, onChange: (event) => onChange(event.target.value) }, options.map(([item, text]) => h('option', { key: item, value: item }, text)))
    }

    function browserGlyph() {
      return h('svg', { viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8' },
        h('circle', { cx: '12', cy: '12', r: '8' }),
        h('path', { d: 'M4.5 12h15M12 4.5c2.2 2.4 3.2 4.8 3.2 7.5s-1 5.1-3.2 7.5c-2.2-2.4-3.2-4.8-3.2-7.5s1-5.1 3.2-7.5z' }))
    }

    function card(title, hint, children) {
      return h('section', { className: 'bu-card' }, h('h2', null, title), hint ? h('p', { className: 'bu-help' }, hint) : null, ...children)
    }
    function toggle(checked, onChange, name) {
      return h('button', { type: 'button', className: 'bu-switch', role: 'switch', 'aria-checked': checked ? 'true' : 'false', 'aria-label': name, onClick: () => onChange(!checked) }, h('span', null))
    }
    function row(title, hint, control) {
      return h('div', { className: 'bu-row' }, h('div', null, h('strong', null, title), hint ? h('p', { className: 'bu-help' }, hint) : null), control)
    }
    function text(value, onChange, label) {
      return h('input', { className: 'bu-input', value: value || '', 'aria-label': label, autoComplete: 'off', onChange: (event) => onChange(event.target.value) })
    }
    function number(value, onChange, label) {
      return h('input', { className: 'bu-input', type: 'number', value, 'aria-label': label, onChange: (event) => onChange(Number(event.target.value)) })
    }
    function select(value, options, onChange, label) {
      return h('select', { className: 'bu-input', value, 'aria-label': label, onChange: (event) => onChange(event.target.value) }, options.map((item) => h('option', { key: item, value: item }, item)))
    }
    function lines(value) {
      return (value || []).join('\n')
    }

    function basic(draft, patch, label) {
      return card(label('navBasic'), null, [
        row(label('enabled'), label('enabledHint'), toggle(draft.enabled, (value) => patch('enabled', value), label('enabled'))),
        row(label('browser'), null, select(draft.browser, ['project-default', 'chrome', 'edge', 'chromium'], (value) => patch('browser', value), label('browser'))),
        row(label('credential'), label('credentialHint'), text(draft.credentialRef, (value) => patch('credentialRef', value), label('credential'))),
        row(label('ttl'), null, number(draft.sessionTtlMinutes, (value) => patch('sessionTtlMinutes', value), label('ttl'))),
        row(label('concurrent'), null, number(draft.maxConcurrentSessions, (value) => patch('maxConcurrentSessions', value), label('concurrent'))),
        row(label('locale'), null, select(draft.locale, ['project', 'zh-CN', 'en-US'], (value) => patch('locale', value), label('locale'))),
      ])
    }

    function session(draft, patch, label) {
      return h('div', null,
        draft.profile.persistent ? h('p', { className: 'bu-warn' }, `${label('warn')}：${label('persistentHint')}`) : null,
        card(label('navSession'), null, [
          row(label('temporary'), label('temporaryHint'), toggle(draft.profile.temporary, (value) => patch('profile.temporary', value), label('temporary'))),
          row(label('persistent'), label('persistentHint'), toggle(draft.profile.persistent, (value) => patch('profile.persistent', value), label('persistent'))),
          row(label('profileName'), null, text(draft.profile.name, (value) => patch('profile.name', value), label('profileName'))),
          row(label('reuse'), null, toggle(draft.profile.reuseSession, (value) => patch('profile.reuseSession', value), label('reuse'))),
          row(label('cleanup'), null, toggle(draft.profile.cleanupOnClose, (value) => patch('profile.cleanupOnClose', value), label('cleanup'))),
          row(label('cookies'), label('cookiesHint'), toggle(draft.profile.persistCookies, (value) => patch('profile.persistCookies', value), label('cookies'))),
          row(label('passwords'), label('passwordsHint'), toggle(false, () => {}, label('passwords'))),
        ]))
    }

    function domain(draft, patch, label) {
      return card(label('navDomain'), label('capHint'), [
        row(label('allow'), label('hostsHint'), h('textarea', { className: 'bu-input', value: lines(draft.domains.allow), 'aria-label': label('allow'), onChange: (event) => patch('domains.allow', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean)) })),
        row(label('deny'), label('hostsHint'), h('textarea', { className: 'bu-input', value: lines(draft.domains.deny), 'aria-label': label('deny'), onChange: (event) => patch('domains.deny', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean)) })),
        row(label('subdomain'), null, select(draft.domains.subdomainMode, ['suffix', 'exact'], (value) => patch('domains.subdomainMode', value), label('subdomain'))),
        row(label('cross'), null, toggle(draft.domains.allowCrossOrigin, (value) => patch('domains.allowCrossOrigin', value), label('cross'))),
        row(label('allowUpload'), null, toggle(draft.domains.allowUpload, (value) => patch('domains.allowUpload', value), label('allowUpload'))),
        row(label('allowDownload'), null, toggle(draft.domains.allowDownload, (value) => patch('domains.allowDownload', value), label('allowDownload'))),
        row(label('allowSubmit'), null, toggle(draft.domains.allowSubmit, (value) => patch('domains.allowSubmit', value), label('allowSubmit'))),
        row(label('popups'), null, toggle(draft.domains.allowPopups, (value) => patch('domains.allowPopups', value), label('popups'))),
        h('h3', null, label('caps')),
        ...CAPS.map((name) => row(name, null, toggle(draft.capabilities[name], (value) => patch(`capabilities.${name}`, value), name))),
      ])
    }

    function approval(draft, patch, label, approvals, respond) {
      return h('div', null,
        card(label('navApproval'), label('riskHint'), [
          row('L0', null, select(draft.risk.L0, ['allow', 'confirm'], (value) => patch('risk.L0', value), 'L0')),
          row('L1', null, select(draft.risk.L1, ['allow', 'confirm', 'deny'], (value) => patch('risk.L1', value), 'L1')),
          row('L2', null, h('span', null, 'confirm')),
          row('L3', null, select(draft.risk.L3, ['deny', 'confirm'], (value) => patch('risk.L3', value), 'L3')),
        ]),
        card(label('approvals'), null, [
          approvals.filter((item) => item.status === 'pending' || item.status === 'approved').length === 0
            ? h('p', { className: 'bu-help' }, label('noApprovals'))
            : approvals.map((item) => h('article', { key: item.id, className: 'bu-approval' },
              h('strong', null, `${item.risk} · ${item.domain || item.targetSummary}`),
              h('p', null, item.consequence),
              h('p', { className: 'bu-help' }, item.dataPreview || item.status),
              item.status === 'pending' ? h('div', { className: 'bu-actions' },
                h('button', { type: 'button', onClick: () => respond(item.id, 'approved') }, label('approve')),
                h('button', { type: 'button', onClick: () => respond(item.id, 'rejected') }, label('reject'))) : null,
              item.status === 'approved' && !item.used ? h('button', { type: 'button', onClick: () => respond(item.id, 'revoked') }, label('revoke')) : null)),
        ]))
    }

    function wait(draft, patch, label) {
      const fields = [
        ['actionTimeoutMs', '动作超时'], ['elementTimeoutMs', '元素等待'], ['networkIdleMs', '网络空闲'],
        ['domStableMs', 'DOM 稳定'], ['maxRetries', '最大重试'],
      ]
      return card(label('navWait'), '提交、删除、支付、发送和发布不会自动重试。', [
        ...fields.map(([key, name]) => row(name, null, number(draft.wait[key], (value) => patch(`wait.${key}`, value), name))),
        row('退避', null, select(draft.wait.backoff, ['none', 'linear', 'exponential'], (value) => patch('wait.backoff', value), '退避')),
        row('失败截图', null, toggle(draft.wait.screenshotOnFailure, (value) => patch('wait.screenshotOnFailure', value), '失败截图')),
        row('失败后暂停', null, toggle(draft.wait.pauseOnFailure, (value) => patch('wait.pauseOnFailure', value), '失败后暂停')),
      ])
    }

    function audit(draft, patch, label, traces, ctx) {
      return h('div', null,
        card(label('navAudit'), '密码、Cookie 和 Authorization 不会写入记录。', [
          row('保存 DOM 摘要', null, toggle(draft.audit.saveDom, (value) => patch('audit.saveDom', value), 'DOM')),
          row('保存截图标记', null, toggle(draft.audit.saveScreenshot, (value) => patch('audit.saveScreenshot', value), '截图')),
          row('保存视频', null, toggle(false, () => {}, '视频')),
          row('保留天数', null, number(draft.audit.retentionDays, (value) => patch('audit.retentionDays', value), '保留天数')),
          row('允许导出', null, toggle(draft.audit.allowExport, (value) => patch('audit.allowExport', value), '导出')),
          row('自动清理', null, toggle(draft.audit.autoCleanup, (value) => patch('audit.autoCleanup', value), '自动清理')),
          h('button', { type: 'button', onClick: () => callRpc(ctx, { action: 'cleanup' }) }, label('cleanupData')),
        ]),
        card(label('traces'), null, [
          traces.length === 0 ? h('p', { className: 'bu-help' }, label('noTraces')) : traces.slice(0, 20).map((item) => h('div', { key: item.runId, className: 'bu-row' },
            h('span', null, `${item.runId} · ${item.failed ? '失败' : '完成'}`),
            h('span', null,
              h('button', { type: 'button', onClick: () => callRpc(ctx, { action: 'browser.trace.export', runId: item.runId }).then((file) => navigator.clipboard?.writeText(file.text || '')).catch(() => {}) }, label('download')),
              h('button', { type: 'button', onClick: () => callRpc(ctx, { action: 'trace.delete', runId: item.runId }) }, label('deleteTrace'))))),
        ]))
    }

    function advanced(draft, patch, label) {
      return card(label('navAdvanced'), null, [
        row('代理引用', null, text(draft.advanced.proxyRef, (value) => patch('advanced.proxyRef', value), '代理引用')),
        row('Webhook 引用', null, text(draft.advanced.webhookRef, (value) => patch('advanced.webhookRef', value), 'Webhook')),
        row('快照文本长度', null, number(draft.advanced.maxTextLength, (value) => patch('advanced.maxTextLength', value), '文本长度')),
        row('单次最大动作数', null, number(draft.advanced.maxActionsPerRun, (value) => patch('advanced.maxActionsPerRun', value), '动作数')),
        row('定位优先级', '逗号分隔，例如 testid, role, label', text((draft.advanced.locatorPriority || []).join(', '), (value) => patch('advanced.locatorPriority', value.split(',').map((item) => item.trim()).filter(Boolean)), '定位优先级')),
        row('启动参数', '只能使用允许名单中的参数', text((draft.advanced.launchArgs || []).join('\n'), (value) => patch('advanced.launchArgs', value.split('\n').map((item) => item.trim()).filter(Boolean)), '启动参数')),
        row('协议版本', null, h('span', null, String(draft.advanced.protocolVersion))),
        h('pre', { className: 'bu-json' }, JSON.stringify(draft, null, 2)),
      ])
    }

    function version(draft, label, changes) {
      return card(label('navVersion'), null, [
        row(label('version'), null, h('span', null, String(draft.version))),
        h('h3', null, label('changes')),
        changes.length === 0 ? h('p', { className: 'bu-help' }, label('noChanges')) : h('ul', null, changes.slice(-12).map((item) => h('li', { key: item.at }, `${item.at} · ${(item.paths || []).join(', ')}`))),
      ])
    }

    const CSS = `
.bu-page { color: var(--dsw-alias-label-primary); font: inherit; }
.bu-kicker { margin: 4px 0 8px; font-size: 13px; color: var(--dsw-alias-label-secondary); }
.bu-auto { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); border-radius: 16px; padding: 4px 16px; }
.bu-browser { display: flex; align-items: center; gap: 12px; min-height: 74px; border-top: 1px solid var(--dsw-alias-border-l1); }
.bu-browser:first-child { border-top: 0; }
.bu-mark { width: 32px; height: 32px; flex: none; object-fit: contain; display: block; }
.bu-status { display: flex; align-items: center; gap: 6px; }
.bu-status i { width: 8px; height: 8px; border-radius: 50%; background: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.bu-status i.is-on { background: var(--dsw-alias-state-success-primary, #1f9d55); }
.bu-empty { margin: 0; padding: 18px 4px; color: var(--dsw-alias-label-secondary); font-size: 13px; }
.bu-perm { max-width: 760px; }
.bu-perm-head { display: flex; align-items: center; gap: 10px; margin: 2px 0 8px; }
.bu-perm-head h1 { margin: 0; font-size: 20px; font-weight: 650; }
.bu-back { width: 32px; height: 32px; border: 0; border-radius: 8px; background: transparent; color: inherit; font-size: 22px; line-height: 1; padding: 0; }
.bu-block { margin-top: 26px; }
.bu-block h2 { margin: 0 0 10px; font-size: 15px; font-weight: 650; }
.bu-block-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 10px; }
.bu-block-head > div:first-child { min-width: 0; flex: 1; }
.bu-block-head p, .bu-copy p { margin: 4px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12.5px; line-height: 1.5; }
.bu-copy { flex: 1; min-width: 0; }
.bu-copy strong { display: block; font-size: 14px; font-weight: 650; }
.bu-sheet { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); border-radius: 16px; padding: 2px 18px 8px; }
.bu-line { display: flex; justify-content: space-between; align-items: center; gap: 28px; min-height: 78px; padding: 14px 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.bu-line:first-child { border-top: 0; }
.bu-select { width: 148px; max-width: 100%; height: 36px; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: inherit; border-radius: 10px; padding: 0 28px 0 12px; flex: none; }
.bu-table-head, .bu-table-row { display: grid; grid-template-columns: minmax(0, 1.4fr) 156px 156px; gap: 16px; align-items: center; }
.bu-table-head { min-height: 42px; color: var(--dsw-alias-label-secondary); font-size: 13px; }
.bu-table-row { min-height: 64px; padding: 8px 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.bu-table-head + .bu-table-row { border-top: 0; }
.bu-table-row .bu-select { width: 100%; }
.bu-add { display: flex; align-items: center; gap: 8px; flex: none; }
.bu-add .bu-input { width: 168px; height: 36px; box-sizing: border-box; }
.bu-add-btn { white-space: nowrap; flex: none; }
.bu-sites-note { margin: 4px 0 10px; }
.bu-risk-title { margin: 14px 0 0; color: var(--dsw-alias-state-warning-primary, #c2410c); font-weight: 650; font-size: 13px; }
.bu-save { margin-top: 22px; }
.bu-save .bu-primary { min-width: 72px; text-align: center; }
.bu-ext { display: flex; align-items: center; gap: 12px; min-height: 72px; }
.bu-ext-icon { width: 28px; height: 28px; flex: none; display: grid; place-items: center; color: var(--dsw-alias-label-secondary); }
.bu-ext-copy { flex: 1; min-width: 0; }
.bu-ext-copy strong { display: block; font-size: 15px; font-weight: 600; }
.bu-ext-copy p { margin: 3px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12.5px; line-height: 1.45; }
.bu-manage { flex: none; }

.bu-layout { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 20px; }
.bu-nav { display: flex; flex-direction: column; gap: 4px; }
.bu-nav button.is-active { border-color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); }
.bu-head h1 { margin: 0 0 6px; font-size: 20px; }
.bu-help { color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 1.5; }
.bu-card { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.bu-row { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.bu-input { width: min(280px, 100%); border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: inherit; border-radius: 8px; padding: 8px; }
.bu-switch { width: 42px; height: 24px; box-sizing: border-box; border: 0; border-radius: 999px; padding: 2px; background: #e6e8ee; display: inline-flex; align-items: center; flex: none; }
.bu-switch[aria-checked="true"] { background: #4d7cff; }
.bu-switch span { display: block; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(16, 24, 40, .18), 0 0 0 0.5px rgba(16, 24, 40, .04); transition: transform .16s ease; }
.bu-switch[aria-checked="true"] span { transform: translateX(18px); }
.bu-dirty, .bu-warn { padding: 8px 10px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-state-warning-primary, var(--dsw-alias-border-l1)); }
.bu-errors { color: var(--dsw-alias-state-error-primary); }
.bu-actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.bu-primary { font-weight: 600; }
.bu-file input { display: none; }
.bu-json { overflow: auto; max-height: 240px; font-size: 12px; background: var(--dsw-alias-bg-layer-2); padding: 8px; border-radius: 8px; }
.bu-approval { border-top: 1px solid var(--dsw-alias-border-l1); padding-top: 8px; }
@media (max-width: 720px) { .bu-layout { grid-template-columns: 1fr; } .bu-row { flex-direction: column; align-items: stretch; } }
.bu-page button:not(.bu-switch):not(.bu-back), .bu-page .bu-file { cursor: pointer; height: 36px; padding: 0 16px; border: 1px solid #d5dbe6; border-radius: 12px; background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary); text-align: center; line-height: 34px; transition: background-color .12s ease, border-color .12s ease, opacity .12s ease; }
.bu-page button:hover:not(.bu-switch):not(.bu-back):not(:disabled), .bu-page .bu-file:hover { border-color: #9aa3b5; background: var(--dsw-alias-bg-layer-2, #f7f8fb); }
.bu-page button:disabled { cursor: not-allowed; opacity: .45; border-color: #e4e7ee; background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.bu-page button:disabled:hover { border-color: #e4e7ee; background: var(--dsw-alias-bg-layer-1, #fff); }
.bu-nav button { width: 100%; text-align: left; }
.bu-page button.bu-primary:not(:disabled) { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: #fff; }
.bu-page button.bu-primary:hover:not(:disabled) { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: #fff; filter: brightness(1.08); }
.bu-page .bu-switch { cursor: pointer; border: 0; }
.bu-page .bu-switch:hover { background: #d8dbe3; }
.bu-page .bu-switch[aria-checked="true"], .bu-page .bu-switch[aria-checked="true"]:hover { background: #4d7cff; border: 0; }
.bu-page .bu-switch[aria-checked="true"]:hover { filter: brightness(1.06); }
.bu-page .bu-back:hover { background: var(--dsw-alias-bg-layer-2); }
`

    const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="40" rx="8" fill="none" stroke="#245c63" stroke-width="4"/><path d="M6 22h52" stroke="#245c63" stroke-width="4"/><path d="M24 34l6 6 12-14" fill="none" stroke="#0f766e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'

    return {
      inject: ['slots', 'connection', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const section = ctx.slots.inject('settings.section', () => ctx.slots.register({
            name: 'settings.section',
            id: 'dsh-browser-use',
            order: 42,
            label: () => t(ctx, 'title'),
          }, () => h(Page, { ctx })))
          const icon = bindIcon('dsh-browser-use', ['权限与控制', 'Permissions', '浏览器自动化', 'Browser automation'], ICON)
          return () => { try { section?.() } catch { /* 分区已卸下 */ } try { icon?.() } catch { /* 同上 */ } }
        })
      },
    }
  },
})
