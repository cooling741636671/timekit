# TimeKit 时光工具箱

纯前端、无构建、双击即可打开的时间工具站。主视觉是翻牌时钟和倒计时，旁边还有日期、效率和开发者小工具，一共 16 个模块。

## 打开方式

直接双击 `timekit/index.html`。不需要安装依赖，也不需要本地服务器。

Chrome / Edge 在 `file://` 下会拦截 ES Module 的 `import`（动态和同步都会报 CORS）。为了满足「双击即开」，脚本改成了按顺序引入的经典脚本，模块挂在 `window.TK` 上，农历和节假日常量仍叫 `LUNAR_2026_2030`、`HOLIDAYS_2026_2027`。这是规格里允许的同步引入，并再退了一步，否则在 Chromium 里双击打不开。

用本地 HTTP 打开时，Service Worker 会缓存静态文件，可以添加到主屏幕。`file://` 下浏览器不允许注册 Service Worker。

## 数据范围

- 农历日表：2026-01-01 至 2030-12-31，由通用农历码表换算，不是手填的样例月。抽查：2026-10-24 为九月十五、丙午年戊戌月辛未日；2027-02-06 为春节。2028 有闰五月，中秋是 **2028-10-03**，不是 9 月 25 日。
- 节气时刻来自寿星公式，日期与上表一致，钟点是近似值。
- 2026 年放假按国务院办公厅国办发明电〔2025〕7号。
- 2027 年只收录国务院令第 795 号里的法定放假日。年度调休还没公布，页面上写的是「尚未公布」，不要当成已定连休。
- 超出这些年份时，对应页面显示「暂无数据」，不会白屏。

## 添加一个工具

1. 新建 `js/modules/你的名字.js`，给 `TK.modules.你的名字` 写上 `mount(el, query)` 和 `destroy()`。
2. `destroy` 里清掉 `setInterval`、`requestAnimationFrame` 和自己加的监听。
3. 在 `index.html` 底部、`app.js` 之前加上 `<script src="js/modules/你的名字.js"></script>`。
4. 在 `js/app.js` 的 `GROUPS` 里加一项：`[id, 名称, 一句话, 图标名]`。图标要先在 `assets/icons.svg` 里有同名 `<symbol>`，并同步进 `index.html` 里的内联雪碧图（`file://` 下外链 `<use>` 会失败）。

用户输入进页面时走 `TK.escapeHtml`，或者直接用 `textContent`。

## 本机存储

`tk_theme`、`tk_countdowns`、`tk_worldclocks`、`tk_pomodoro_settings`、`tk_pomodoro_stats`、`tk_favorites`、`tk_unit_recent`、`tk_password_options`。主题对象里多了 `followSystem`，用来记住「跟随系统」。

## 妥协

- 不做懒加载。全部脚本同步进来，首屏体积会大于「只含首页脚本、gzip 60KB」的目标，主要是农历全表和二维码库。
- `crypto.subtle` 在 `file://` 不可用。哈希页的 SHA 会退回页面内的实现；在 localhost / https 下仍优先走 SubtleCrypto。MD5 始终是手写的。
- 2027 放假调休没有官方全文，所以没有编造补班日。
