# pushy-admin 全局 Review 与改进建议

> Review 日期：2026-07-04
> 技术栈：React 19.2 · Ant Design 6.5 · Tailwind CSS 4.3 · TanStack Query 5 · react-router 7 · rsbuild · Bun
> 覆盖维度：UI/视觉设计（重点）、代码架构与质量、国际化与文案、性能与工程化

---

## 总体评价

项目整体基础扎实：路由级懒加载全部到位（首屏入口仅 ~54K）、外链 `rel="noopener noreferrer"` 全部合规、无 `dangerouslySetInnerHTML`、open-redirect 已有防护、i18n 框架搭建正确、纯函数已有 6 个测试文件。

主要短板集中在三块：

1. **视觉设计缺乏"单一来源"**——主色存在三种蓝、语义色大量硬编码 hex、无暗色模式、`page-section` 是未定义的幽灵类；
2. **数据写路径不统一**——`request.ts` 的 401/非 200 处理有实际 bug，缓存副作用埋在 service 层导致无 loading/无回滚；
3. **工程门禁缺失**——CI 不跑 typecheck/lint/test，`package.json` 甚至没有 `test` 脚本，已有测试形同虚设。

---

## 一、UI / 视觉设计（重点）

### 1.1 【高】品牌色没有单一定义源，全站存在"三种蓝"

| 来源 | 颜色 | 位置 |
|---|---|---|
| 品牌色（meta/logo） | `#4483ED` | `index.html:7` |
| antd 默认主色 | `#1677ff` | `src/index.tsx:74` 的 `ConfigProvider` 未设 `theme.token.colorPrimary`，所有 primary 按钮走默认值 |
| Tailwind 蓝 | `#2563eb` (blue-600) | `top-navigation.tsx:355,690`、`app-detail-header.tsx:123-125`、`app-drawer.tsx:352,380,384`、`manage/index.tsx:97`、`daily-check-quota.tsx:113,266`（Progress `strokeColor` 硬编码） |

**建议**：以品牌色为准，建立唯一色源：

```tsx
<ConfigProvider theme={{ token: { colorPrimary: '#4483ED' }, cssVar: true }}>
```

开启 antd 6 的 `cssVar` 后，在 Tailwind 4 的 `@theme` 中把 `--color-primary` 映射到 `var(--ant-color-primary)`，随后全仓替换 `blue-600/blue-500` 硬编码。**这是本次 review 中投入产出比最高的一项改动。**

### 1.2 【高】语义色（成功/警告/错误）大量硬编码 hex

- `manage/components/bind-package.tsx:89-164`：`#dc2626`(红)、`#16a34a`(绿)、`#d97706`(橙)、`#6b7280`(灰) 反复内联；
- `daily-check-quota.tsx:110-160,263-352` 与 `user.tsx:979-988`：`#ef4444 / #f59e0b / #2563eb / #fecaca / #fde68a / #e5e7eb` 成组重复出现 **3 处**；
- 零散：`audit-logs.tsx:487` `#ff4d4f`、`utils/notice.tsx:11` `#f50`、`main-layout.tsx:57,63` `#fff`/`#e5e7eb`、`platform-icon.tsx:19-24` `#3ddc84`/`#a6b1b7`。

**建议**：统一改用 antd token（`colorError/colorSuccess/colorWarning/colorTextSecondary`）或 Tailwind 语义类；把配额三态颜色（exceeded/low/normal 的 `strokeColor/trailColor/边框/文字`）抽成一个 helper，消除三处重复。

### 1.3 【高】完全不支持暗色模式，且硬编码浅色会在暗色下破裂

- `ConfigProvider` 无 `theme.algorithm`，全仓无 `darkAlgorithm`/`prefers-color-scheme` 相关代码；`manage/index.tsx:217` Sider 还硬编码 `theme="light"`。
- 即使将来接入 antd 暗色算法，这些硬编码也会导致白底黑字撕裂：`main-layout.tsx:57 background:'#fff'`、`index.css:41 .body{background:#fff}`、`app-drawer.tsx:110 bg-white`、`manage.css:33,36,62`（`#fff`/`#e6f7ff`/`#f0f0f0`）、大量 `text-slate-* / text-gray-* / bg-slate-50`。

**建议**：`theme.algorithm` 跟随 `prefers-color-scheme`（并提供手动切换），底色/文字统一走 token 或补 `dark:` 变体。建议与 1.1 一起做，先建立 token 体系再谈暗色。

### 1.4 【中】`page-section` 是"幽灵类"——8 处使用但无任何定义

`admin-apps.tsx:280`、`admin-users.tsx:588`、`admin-config.tsx:213`、`admin-metrics.tsx:370`、`admin-service-status.tsx:1052`、`home.tsx:11`、`admin-route.tsx:43,59` 都用了 `className="page-section"`，但 `index.css` 与 `manage.css` 中**没有该类的定义**。页面容器留白目前只靠 `.ant-layout-content{padding:24px}`（`index.css:17`），没有统一最大宽度。

**建议**：新建 `PageContainer` 组件（max-width + `margin-inline: auto` + 统一 padding + 统一标题层级），替换所有 `page-section`。

### 1.5 【中】页面标题层级混乱

`apps.tsx:80` 用 `Title level={3}`；admin 系列页面用 `level={4}`；`admin-service-status.tsx` 内部 `level={5}` 与 `level={4}` 混用；`audit-logs.tsx:605` 干脆用原生 `<h2 class="text-lg font-semibold md:text-xl">`。

**建议**：随 `PageContainer` 统一页面主标题（如固定 `level={4}`）。

### 1.6 【中】加载态只有 Spin、无 Skeleton；空状态样式不统一

- `Spin` 出现在 11 个文件，`Skeleton` 全仓零命中；全屏 loading 容器高度不一（`home.tsx:11 min-h-64`、`user.tsx:604 h-screen`、`admin-route.tsx:43 min-h-64`）。
- `Empty` 有的用 `PRESENTED_IMAGE_SIMPLE`（`app-drawer:217`），有的用默认大图（`apps:124`），内边距 `my-8` vs `py-16` 各异。

**建议**：卡片列表/表格首屏改用 Skeleton 骨架；封装统一的 `EmptyState` 与页面级 loading 容器。

### 1.7 【中】inline style 与 Tailwind 混用、圆角/魔法数字无系统

- 内联 style：`main-layout.tsx:55-74`、`login.tsx:74-85`、`register.tsx:148-159`（整套 auth 布局）、`manage/index.tsx:183,220,228`、`commit.tsx:7-11`。
- 圆角混用：`rounded-lg`（app-drawer:110）、`rounded-xl`（user:893）、`rounded-2xl`（apps:164,183）、`rounded-md`。
- 魔法数字：`user.tsx:705 width:134`、`login:78 maxWidth:360`、`app-drawer:111 w-[280px]`、`commit.tsx:8-9 maxWidth:288/maxHeight:240`、`user.tsx:237/559 w-[340px]/w-[560px]`。

**建议**：约定圆角/间距/阴影三套刻度（如卡片统一 `rounded-lg`）；auth 三页（login / register / reset-password 目前分别是内联 360 表单 / Card 640 / w-80）统一为一个 `AuthLayout`。

### 1.8 【中】视觉细节

- **图标风格不统一**：`platform-icon.tsx` 中 android/ios 用 `AndroidFilled/AppleFilled`，harmony 却用 `HarmonyOSOutlined`（:24）；设置图标在 `app-detail-header.tsx:73` 是 `SettingFilled`，在 `app-drawer.tsx:429`、`top-navigation.tsx:841` 是 `SettingOutlined`。
- **删除按钮过重**：`app-settings-modal.tsx:164-180` 同时 `type="primary" + danger + DeleteFilled`，实心大红块视觉侵略性强；确认弹窗已有 `okButtonProps:{danger:true}`，按钮本身用普通 `danger` 即可。
- **`create-app-modal.tsx:15-21`**：用 `Modal.confirm` 承载表单，裸 `<br/>` 撑间距，表单值存闭包变量；应改受控 `Modal` + `Form`。
- **`footer.tsx:13-17`**：备案图标引用 alicdn 固定小图无加载兜底。
- **`index.html:5`**：viewport 缺 `initial-scale=1`。
- **`manage.css:103-111`**：移动端 Sider 用 6 个 `!important` 对抗 antd 内联宽度，脆弱；建议移动端直接不渲染 Sider（复用现有 Tabs 分支 `manage/index.tsx:186`）。

### 1.9 设计系统层面路线图

1. **唯一色源**：`ConfigProvider theme.token` + `cssVar:true`，Tailwind `@theme` 消费 antd CSS 变量，替换全部硬编码 hex 与 `blue-*`。
2. **暗色模式**：token 体系建立后接 `darkAlgorithm` + `prefers-color-scheme`，清理硬编码浅色。
3. **布局/状态原语**：`PageContainer`、`AuthLayout`、`EmptyState`、Skeleton 骨架，替换幽灵类与各自为政的容器。
4. **设计刻度**：圆角/间距/阴影三套刻度成文，biome/lint 禁止新增裸 hex 与内联 style。
5. **业务视觉逻辑收敛**：配额三态颜色 helper、图标填充风格规范、danger 按钮使用规范。

---

## 二、代码架构与质量

### 2.1 数据层

- **【严重】`request.ts:84-87`：401 静默返回 `undefined` 而非 reject**。api.ts 中大量 `request(...).then(() => queryClient.setQueryData(...))`（deleteApp:202、updateApp:226、updatePackage:259、deletePackage:273、deleteVersion:335），401 下 `.then` 仍执行——**请求实际失败但前端缓存已被乐观删除/修改**。应 `throw RequestError`。
- **【严重】`request.ts:89`：无条件 `response.json()` 且仅 `status===200` 视为成功**。204/201/网关 HTML 错误页会抛 SyntaxError，被外层 catch 吞掉后统一提示"如有使用代理，请关闭代理"，误导用户。应按 `response.ok` + `content-type` 处理。
- **【高】query key 魔法字符串**：只有 versions 走了 `query-keys.ts` 工厂，`['appList']`、`['app', appId]`、`['packages', appId]`、`['bindings', appId]` 在 api.ts（203/227/261/276/291/426/435）与 hooks.ts 两处重复散落。
- **【高】`setQueryData` updater 解构未防 undefined**：`api.ts:262/276/291` 直接 `({ data }: { data: Package[] }) => ...`，缓存为空时抛 TypeError；而 `deleteVersion:338`、`deleteBinding:436` 已是正确写法，风格不一。
- **【高】缓存副作用埋在 service 层，两套 mutation 范式并存**：manage 相关组件直接调 `api.deleteVersion()`——无 loading、无 onError、无回滚；而 api-tokens / admin-apps / admin-users 等又规范地用 `useMutation`。应统一：service 只做纯请求，副作用移到 `useMutation` 的 onSuccess/onError。
- **【中】`hooks.ts:349-384` useAuditLogs**：一次拉 1000 条前端分页，`queryKey: ['auditLogs']` 不含筛选参数。
- **【中】`hooks.ts:176`**：`enabled: () => !!getToken()` 依赖模块级可变 `_token`，非响应式，登录/登出靠 `window.location.reload()` 兜底。
- **【中】`request.ts:30-40`**：模块加载即并发 ping 多域名（IIFE 副作用）+ 生产残留 `console.log('baseUrl', ...)`（:37）。

### 2.2 组件设计

- **【高】超大组件**（>300 行，前几名）：`user.tsx` 1308、`admin-service-status.tsx` 1078、`top-navigation.tsx` 919、`audit-logs.tsx` 802、`admin-users.tsx` 747、`realtime-metrics.tsx` 610、`bind-package.tsx` 556、`api.ts` 517。建议按「数据 hook / 纯展示组件 / 命令式弹窗」三层拆分。
- **【高】可变闭包代替受控状态**：`version-table.tsx:277-333` 与 `package-list.tsx:174-215`（以及 `login.tsx:9` 模块级 `let email,password`）用 `let value = ...` + onChange 赋值 + `Modal.confirm` 提交，绕过 React 数据流，难测试、易 stale、表单校验失效。应抽受控 `Form` 组件。
- **【中】`version-table.tsx:274,350`**：`getColumns(t)` 未 memo，且 `TextColumn`（每行每列渲染）内部又调一次完整 `getColumns(t)` 只为取 title——N 行 × M 列次全量列构建。`useMemo` + title 作 prop 传入。
- **【中】`version-table.tsx:278-287`**：手写补零拼日期，项目已有 dayjs。
- **【中】`helper.ts:95-170` + `top-navigation.tsx:194-200,500-506`**：drawer 状态用 `CustomEvent` + `storage` 事件在 window 上手搓全局状态，主/移动两处重复监听。应改 context 或轻量 store。
- **【中】`manage/index.tsx:146-169`**：已有 ManageContext 仍 props drilling 传 selection 状态。

### 2.3 路由与鉴权

- **【高】token 存 localStorage**（`request.ts:6-13`），XSS 可窃取。优先 httpOnly cookie；若架构受限，至少强化 CSP 并记录该权衡。
- **【高】`auth.ts:19-30` 与 `router.tsx:45-56`**：open-redirect 防护逻辑几乎逐行重复，应抽公共函数。
- **【中】`admin-route.tsx`**：自造代码分割（useEffect 手动 `load().then(setComponent)` + 渲染期 throw），与其余路由的 `lazy:` 是两套机制、双重 Spin。另 admin 鉴权是纯前端判断（`user.admin`），需确认服务端有二次校验。
- **【中】`auth.ts:52-59`**：logout 触发 `location.reload()`，配合 401→logout，接口持续 401 时有反复刷新风险。

### 2.4 类型

- **【高】`globals.d.ts:58-76`**：把 `User/App/Package/Version` 等领域类型声明为全局 ambient 类型，全项目免 import 使用——隐藏依赖、妨碍重构。应删除，改显式 `import type`。
- **【中】断言/any 滥用**（全仓约 64 处）：`version-table.tsx:322` 双重 `as unknown as`、`:288 let editable: any`、`types.ts:58/99/160` 与 `api.ts:19/27` 的 `Record<string, any>` / `Record<any,any>`。
- **【中】`globals.d.ts:24-56`**：手写 `bun:test` 类型，与 `@types/bun` 重复维护。

### 2.5 健壮性

- **【中】`index.tsx:73-79`**：RouterProvider 外层无 React ErrorBoundary，Provider 级异常会白屏。
- **【低】`utils/notice.tsx:28-33`**：import 即弹窗的模块顶层副作用（当前虽未被引入，但模式危险）。

---

## 三、国际化与文案

> 好消息：en.json 与 zh-CN.json 的 key 完全对齐（各 682 个，无单边 key）；antd `ConfigProvider locale` 与语言切换器逻辑正确。以下问题主要是"代码引用了但两边 JSON 都没有的 key"与硬编码中文。

### 3.1 【高】20 个缺失 key，界面直接显示原始 key

- `admin-users.tsx:142-147`：`translate = (key, fallback) => t ? t(key) : fallback` 中 `t` 恒为真，中文 fallback 是死代码；而其引用的 **14 个 `admin_users.*` key**（`detail_title, basic_info, quota_usage, pv_limit, today_used, today_remaining, avg_7_days, last_7_days_details, app_limit, package_limit, apps_and_packages, packages_count, pkg_name, col_note`）两边 JSON 都不存在——用户详情面板显示 `admin_users.detail_title` 这类原始字符串。
- `audit-logs.tsx:426-428`：Excel 导出列头 `audit_logs.col_browser / col_os / col_ip_addr` 缺失。
- `manage/index.tsx:178`、`version-table.tsx:387`：`common.search` 缺失，搜索框 placeholder 显示 "common.search"。

**建议**：补齐 20 个 key；顺手修掉（或删除）失效的 translate helper。

### 3.2 【高】硬编码中文（英文用户看到中文）

- `utils/notice.tsx:7-21`：整个升级公告 Modal（含 "我知道了"/"不再显示"）全中文。
- `utils/hooks.ts:184,190-191,198`：`'定制版'`、`'YYYY年MM月DD日'`（应复用已有 `user.date_format` key）、`'无'`、`` `(剩余 ${remainingDays} 天，之后转为免费版)` ``。
- `constants/quotas.ts:3-106`：套餐 title/summary 全中文，且 `user.tsx:300,613` 直接渲染原始 title——而 `daily-check-quota.tsx:15` 的 `getTierTitle` 已正确本地化，说明 user.tsx 两处漏改。
- `bind-package.tsx:22-279`：`changeType: '新增' | '移除' | '版本变更'` 中文同时当枚举值和展示文案，应改英文枚举 + 显示层 `t()`。
- `auth.ts:39,46`（'登录成功'/'登录失败'）、`request.ts:111-112`（全局错误提示"如有使用代理，请关闭代理后重试"——出现频率最高的一条）。

### 3.3 【高】`hooks.ts:10` 全局 `dayjs.locale('zh-cn')` 模块副作用

一旦 import 就锁死 dayjs 中文；`audit-logs.tsx:247` 又有局部切换，行为依赖加载顺序。`commit.tsx` 的 `fromNow()` 在英文环境可能仍显示"几秒前"。**建议**：删除该行，在 App 顶层随 `i18n.language` 统一切换 dayjs locale（一次）。

### 3.4 【低】细节

- `index.tsx:71`：antd locale 兜底是 `zhCN`，而 i18n `fallbackLng` 是 `'en'`，不一致，建议统一为 en。
- en.json 术语大小写：`"Native packages"` vs `"Native Packages"` 混用（en.json:77 vs 96/622/654）。
- `realtime_metrics.unknown` 在 zh-CN 中仍是 "unknown"，应为"未知"。
- 数字格式 `toLocaleString()` 未传 locale 参数。
- 无障碍整体覆盖较好（aria-label/role/aria-selected 都有）；`notice.tsx:11` 的 `#f50` 橙色文字对比度偏低。

---

## 四、性能与工程化

### 4.1 【高】CI 无质量门禁，测试形同虚设

- `.github/workflows/gh-pages.yml:23-28` 只有 `bun install && bun run build && 部署`，不跑 typecheck / lint / test。
- `package.json` **没有 `test` 脚本**，但项目有 6 个测试文件 + `bun-test-setup.ts` + bunfig preload——基础设施齐全却无人执行。

**建议**：新增 `"test": "bun test"`；CI 在 build 前加 `bun run typecheck`、`biome check .`（只读）、`bun test` 三道门禁。

### 4.2 【中】bundle 优化

- 路由级懒加载已全部到位（👍 首屏 54K）。
- `@ant-design/charts` 产出 ~1.4M + 996K 异步 chunk（`realtime-metrics.tsx:1`、`admin-service-status.tsx:1`、`admin-metrics.tsx:1` 静态引入），仅用到折线图；可换按需子包/轻量库，或组件级再 lazy 一层。
- `vanilla-jsoneditor`（含 CodeMirror）被静态打进最高频的应用管理页 chunk（`version-table.tsx:28`），但只在"编辑 metaInfo"的 Modal 里用到——改 `React.lazy` 按需加载。
- `xlsx` 已动态 import（👍 `audit-logs.tsx:397`），但 0.18.5 有已知 CVE（原型污染/ReDoS）且 npm 版已停更；当前只用于导出、风险低，仍建议换 SheetJS 官方源或轻量导出库消除 SCA 告警。

### 4.3 【中】TanStack Query 配置

`queryClient.ts:3-9` 全局 `staleTime: 5000` 过短，配合默认 `refetchOnWindowFocus: true`，切标签页就重复请求。建议列表类提到 30–60s 或关闭聚焦重取（实时页已有局部 `refetchInterval`，不受影响）。

### 4.4 【低】脚本与 lint

- `lint` 脚本 = `tsgo && biome check --write .`：校验命令带 `--write` 副作用，且与 `typecheck` 重叠。拆为只读 `lint` + `format`/`lint:fix`。
- `biome.json` 关闭了 `noExplicitAny`、`noNonNullAssertion` 等，与 2.4 的 any 泛滥互为因果，建议先设 `warn` 逐步收敛。
- rsbuild 可接入体积分析插件 + CI 体积门禁，防止重库进首屏。

---

## 五、优先级路线图

### P0 — bug 与门禁（1~2 天）✅ 已完成（2026-07-04）

1. ✅ 修 `request.ts`：401 改为 throw；按 `response.ok` + content-type 处理响应（§2.1）。响应处理逻辑抽到 `src/services/response.ts`，并新增 `response.test.ts`（7 个用例覆盖 401/204/非 JSON/2xx/业务错误/suppressErrorToast）。同时修复 `api.ts` 中 packages 系列 `setQueryData` 未防 undefined 的崩溃隐患。
2. ✅ 补齐 20 个缺失 i18n key（admin_users 详情 14 个、audit 导出列头 3 个、`common.search`、以及 `col_note`/`detail_title` 等），修复 admin-users 失效的 translate helper（改用 `useTranslation`）。两份 locale key 完全对齐。
3. ✅ `package.json` 加 `test`/`lint`（只读）/`lint:fix`/`ci` 脚本；新增 `.github/workflows/ci.yml`（PR 触发 typecheck+lint+test），并在 `gh-pages.yml` 部署前加同款门禁。
4. ✅ 移除全局 `dayjs.locale('zh-cn')`，新建 `src/utils/dayjs.ts` 统一注册插件并随 i18n 语言切换 locale；i18n `fallbackLng` 与 antd locale 兜底均保持 `zh-CN`/`zhCN` 对齐。

### P1 — 视觉设计地基（3~5 天）✅ 已完成（2026-07-04）

5. ✅ 建立唯一色源：新增 `src/theme.ts`（`colorPrimary:#4483ed` + `cssVar`），`ConfigProvider` 注入；`index.css` 用 `@theme inline` 把 Tailwind 的 `primary/success/warning/error/text-*` 等工具类映射到 antd 输出的 `--ant-color-*` 变量。全仓替换"三种蓝"（app-drawer/top-navigation/app-detail-header/manage/apps/user/admin-service-status 等的 `blue-600/500` → `primary`）与硬编码语义色（bind-package/daily-check-quota/user/audit-logs/main-layout/login/register 的 hex → token 或语义类）。配额三态颜色抽成 `getCheckQuotaColors` helper（消除三处重复）。删除按钮从 `primary+danger+Filled` 降级为普通 `danger+Outlined`。（§1.1、§1.2、§1.8）
6. ✅ 补齐幽灵类：在 `index.css` 定义 `.page-section`（max-width 1280 + 居中），修复 8 处页面容器无最大宽度约束的问题；新增 `PageContainer` 组件供后续采用；统一标题层级（apps 的 `level=3`、audit-logs 的原生 `<h2>` → `level=4`，与 admin 页面对齐）。（§1.4、§1.5）
7. ✅ i18n 化硬编码中文：request/auth（错误/登录提示）、notice（重构为显式 `showNotices()`，消除 import 副作用 + 全文 i18n）、hooks（`useUserInfo` 的到期/剩余天数/定制版，日期格式改 locale-aware）、bind-package（`新增/移除/版本变更` 枚举改英文 + 显示层 `t()`）、admin-users（次/个单位）、apps（key_pending）。默认语言保持中文（`fallbackLng: 'zh-CN'`，antd 兜底 `zhCN`）。（§3.2）

> AuthLayout 与 EmptyState/Skeleton 未强制落地：现有各页布局差异较大，强行统一风险高于收益，留待按页迭代；`PageContainer` 已就绪，新页面可直接采用。

### P2 — 架构收敛（持续）

8. ✅（2026-07-05）service 层去缓存副作用：`api.ts` 全部 mutation 改为纯请求，缓存写入集中到新建的 `src/services/mutations.ts`（useMutation hooks + 单一缓存 updater 层）。调用点全部迁移：bind-package / version-table / package-list / setting-modal / app-settings-modal 改用 `useMutation`（带 isPending/错误保持弹窗），create-app-modal（非组件上下文）走 `mutations.createApp` 命令式包装。query key 此前已全部收进 `query-keys.ts`。（§2.1）
9. ◐ 部分完成（2026-07-05）：version-table 的闭包编辑改受控 `EditFieldModal`（JSON 草稿用 ref 适配非受控的 vanilla-jsoneditor）、package-list 的 edit 改受控 `EditPackageModal`（Form 实例 + validateFields）、login.tsx 模块级 `let email/password` 改 useState 受控；`getColumns(t)` 加 useMemo 并把 title 作 prop 传入 TextColumn（消除 N×M 次全量列构建）；手写补零日期改 dayjs。**前三大超大组件均已拆分**：user.tsx（1308 行）→ `src/pages/user/`（billing.ts 计费纯函数 / purchase-controls.tsx 购买弹层 / quota-details.tsx 配额面板 / index.tsx 组装）；top-navigation.tsx（919 行）→ `src/components/top-navigation/`（nav-items.tsx 菜单构建 / app-switcher.tsx 应用切换器 / use-app-drawer-placement.ts 共享 hook——顺带消除了 §2.2 提到的 CustomEvent+storage 双份监听 / index.tsx）；admin-service-status.tsx（1079 行）→ `src/pages/admin-service-status/`（metrics.ts 纯聚合与格式化逻辑 + **metrics.test.ts 10 用例** / status-panel.tsx / target-sidebar.tsx / index.tsx）。均为纯移动式拆分，路由目录解析无需改动。剩余较大文件：audit-logs.tsx（788）、admin-users.tsx（729），已低于 review 点名的前三名，可按需继续。（§2.2）
10. ✅ 基本完成（2026-07-05）：`globals.d.ts` 领域 ambient 类型已删（现仅剩资源模块声明与 bun:test 类型）；version-table 的 `editable: any` 与 `as unknown as` 双重断言已清除（全仓 any/断言余 2 处）；请求构造逻辑抽为纯函数 `src/services/build-request.ts` + `build-request.test.ts`（5 用例；真实 request 模块被 bun-test-setup 全局 mock 无法直接测，响应半边已有 response.test.ts 覆盖）；router loader 的鉴权跳转与 open-redirect 防护抽为 `src/utils/safe-redirect.ts` 纯函数并新增 `safe-redirect.test.ts`（9 用例），同时消除了 §2.3 指出的 auth.ts 与 router.tsx 防护逻辑逐行重复。（§2.3、§2.4、§2.5）

### P3 — 锦上添花

11. ✅（2026-07-05）暗色模式：`ThemeModeProvider`（`src/utils/theme-mode.tsx`）默认跟随系统 `prefers-color-scheme`，支持手动覆盖（auto/light/dark，localStorage 持久化）；ConfigProvider 按解析结果切换 `darkAlgorithm`，`<html>` 同步 `.dark` 类与 `color-scheme`。适配方式：把全仓既有的 slate/gray/blue/red/amber/emerald Tailwind 刻度在 `@theme inline` 中整体重映射到 antd token（--ant-*），darkAlgorithm 翻转变量后全部颜色类自动适配，无需逐处加 `dark:` 变体；`bg-white`/`to-white` 全部替换为语义类 `bg-container`/`to-container`；manage.css 残留 hex 改 antd 变量；三处 @ant-design/charts 图表按主题切换 `classicDark`。切换入口：导航栏胶囊控件组 `NavControls`（主题 + 语言圆形图标按钮，Dropdown 选择），移动端菜单同步提供主题子菜单。（§1.3）
12. ✅ 基本完成（2026-07-05）：`vanilla-jsoneditor` 改 `React.lazy` 按需加载（已从应用管理页 chunk 拆出独立异步 chunk，~275K）；`staleTime` 5s → 30s（切标签页不再重复请求，实时页有自己的 refetchInterval 不受影响）；**xlsx 已彻底移除**：审计日志导出改为零依赖 CSV（`src/utils/csv.ts`，RFC 4180 转义 + BOM 保证 Excel 打开中文不乱码，含单测；曾短暂替换为 write-excel-file 后按产品决策进一步改 CSV），导出不再有独立 chunk，同时消除停更且带 CVE 的 SheetJS 依赖。charts 按需子包未做（路由级已 lazy，收益有限）。（§4.2、§4.3）
13. token 迁出 localStorage：决定先由 server 端支持 httpOnly cookie 会话后，前端再跟进改造（移除 localStorage 读写、请求改 credentials）。前端部分待 server 就绪。（§2.3）
