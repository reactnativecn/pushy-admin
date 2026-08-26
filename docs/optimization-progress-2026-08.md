# 2026-08 优化改造进度

来源：2026-08-25 对 pushy-admin 的全量审计（bundle 归因 + 代码审计），共 23 项，用户要求全部修。
本文记录已完成 / 待完成，以及移植到 cresc-admin 的对照清单。上下文断掉后从「剩余工作」一节接着做。

## 状态总览

| 仓库 | 已提交 | 待办 |
|---|---|---|
| pushy-admin | `a0a7830`（第一批）、`950ee19`（第二批）、`089ec01` + `e17de14`（第三批） | 无，已推送 |
| cresc-admin | `0a02bd5`（第一批）、`9d22e51`（第二批）、第三批（223 tests，产物 4598 KB） | 无，已推送 |

验证基线（pushy-admin `e17de14`）：`bun run ci` 通过，400 tests；`CI=true bun run build:check` 产物 initial 1296 KB / async 3402 KB / total 4697 KB（改造前 5664 KB min、1761 KB gzip → 约 4824 KB / 1509 KB gzip）。

## 已完成

### 第一批 `a0a7830`：打包 / 配置 / 共享工具（cresc 已移植 `0a02bd5`）
- `lazy-chart.tsx` 改引 `@ant-design/plots`，每种图表静态挑导出（原 `module[type]` 让 tree-shaking 失效，把整个 G6 图库 ~780KB 打进来）
- `package.json`：`@ant-design/charts` → `@ant-design/plots`；删 `history`、`@types/react-router-dom`；`@rsbuild/*` 移到 devDependencies；新增 `size` / `build:check` 脚本
- `deps-table.tsx`：`Mode` 改 type import（`'tree' as Mode`）；`DepsDiff`（json-diff-kit）改 lazy + Suspense —— `/apps/:id` 不再同步拉 1MB jsoneditor
- `version-health.tsx:20` 裸 U+001F 控制字符改成 `''` 转义
- `index.html` 两个 API 域 preconnect
- 新 `src/utils/storage.ts`：`safeStorage.get/set/remove`；`helper.ts` / `hooks.ts` / `endpoint.ts` 全部改用
- `response.ts` / `request.ts`：`RequestError.handled`（已弹过提示 / 401 已登出）；`queryClient.ts` 加 `MutationCache.onError` 兜底（未 handled 才弹；`meta.silentError` 退出）
- `api.ts` 新 `getPackageCount`（limit=1 只取 count）；`user/index.tsx` 用它替代全量 `getPackages`
- `admin-route.tsx` 改门控 + `<Outlet/>`；`router.tsx` 管理员页改 `children: [{ index, lazy }]`
- 新 `src/constants/i18n-keys.ts`：`MEMBER_ROLE_LABEL_KEY` / `MEMBER_ROLE_DESC_KEY` / `THEME_MODE_LABEL_KEY`；nav-items、workspace-switcher 改用
- tsconfig：`include`/`exclude`、`noFallthroughCasesInSwitch`、`noUncheckedIndexedAccess`（附带约 35 处 `?.` / `??` / `!` 修补）
- biome：`noUnusedImports` / `noUnusedVariables` = error
- 新 `scripts/check-bundle-size.mjs`（initial 1400KB / async chunk 1600KB / total 5200KB）；`ci.yml`、`gh-pages.yml` 改跑 `build:check`

### 第二批 `950ee19`：页面级重构（cresc 已移植 `9d22e51`，serviceStatusKeys 按 cresc 单节点/Cloud Run 形态重排）

**A. audit-logs / admin-users / admin-apps / admin-config**
- 新 `src/utils/table-state.ts`（+ `table-state.test.ts`）：`parsePositiveInt` / `parseOptionalPositiveInt` / `getDefaultPageSize(isMobile)` / `useUrlTableState({ searchParam, sortableColumns, filterKeys, normalizeFilter })` → `{ searchParams, setSearchParams, isMobile, page, pageSize, searchQuery, searchInput, setSearchInput, orderBy, order, sortOrderOf, handleTableChange }` / `usePageClamp(state, total, ready)`（ready = `!isPlaceholderData`，修掉读 placeholder 数据夹页的 bug）/ `getTablePagination(state, total, showTotal)`
- 新 `src/utils/responsive.ts`：`useIsMobile()` / `useModalWidth(desktopWidth)`
- `audit-logs.tsx`：`useUrlTableState({ searchParam: 'query' })`；actionMap 每次渲染只建一次并向下传；日期范围下发服务端（`startOf/endOf('day')` ISO）；`total > 已加载条数` 时显示 `audit_logs.capped_notice`（服务端 `MaxLimit=100` 且返回 `total`，旧代码读的是不存在的 `count`，一直是 0）
- `admin-users.tsx` / `admin-config.tsx`：字节相同的 `JsonEditorWrapper` 删掉，复用 `manage/components/json-editor.tsx`（`content={{ text }}`，className `h-[200px] [&>div:last-child]:h-full`）；不再静态引 `vanilla-jsoneditor`；admin-config 的保存/删除改 `useMutation`（`loading=isPending`，统一 invalidate `adminKeys.config()`）
- `admin-apps.tsx`：`filterKeys ['platform','status','userId']` + `normalizeFilter`；`copyAppKey` await clipboard，失败 toast `admin_apps.copy_failed`
- `hooks.ts` `useAuditLogs({ startDate?, endDate? })` → `{ auditLogs, total, isLoading, isPlaceholderData }`；常量 `AUDIT_LOG_RETENTION_DAYS=180` / `AUDIT_LOG_FETCH_LIMIT=1000`；`api.ts getAuditLogs` 接受 `endDate`，`URLSearchParams` 拼参，响应类型 `{ data; count?; total? }`

**B. api-tokens / mcp-connections / members**
- 新 `src/constants/token-scopes.ts`（`API_TOKEN_SCOPES` / `MCP_SCOPES` + 类型）
- 新 `src/utils/app-options.ts`：`useAppOptions({ enabled })` → `{ appOptions, appNameById }`
- 新 `src/components/new-token-reveal-modal.tsx`、`token-columns.tsx`（`TokenRow` / `TokenColumnTexts` / `getTokenColumns`）、`token-create-modal.tsx`（`TokenCreateModal` / `TokenAppsFormItem`）
- `i18n-keys.ts` +`API_TOKEN_SCOPE_DESC_KEY` / `MCP_SCOPE_DESC_KEY`；`query-keys.ts` +`endpointKeys.apiBase(customBaseUrl)`；locales +`common.copy_failed`
- api-tokens 473→340 行、mcp-connections 439→312 行（apiBase 改 `useQuery` staleTime Infinity）；members 用 `useAppOptions`、角色 key 查表
- 行为变化：create 改 `mutate`（失败弹窗保持打开、兜底 toast）；去掉 `error.message || t('create_failed')` 回退文案

**C. 图表 / 指标页 / 服务状态**
- 新 `src/utils/charts.ts`：`buildTimeSeriesLineConfig({ data, isDark, height, xTitle?, yTitle?, axisTimeFormat?='MM/DD HH:mm', formatTooltipValue?, sharedTooltip?=true, colorDomain?, legendValuesRef? })`；`getRangePresets(t, labelKeys, now?)`；`RangePresetKey`
- 新 `src/utils/metrics.ts`（纯函数）：`sumByTime` / `attachSharePercent` / `buildTotalSeries` / `aggregateSeries({ isTotal?, topN })` / `buildLegendDefaults(sortedCategories, { totalLabel?, pinned?, topN })`；测试 `charts.test.ts`（9）、`metrics.test.ts`（12）
- `query-keys.ts`：`metricsKeys.app / appEvents / packageWarnings`；删 `metricsKeys.internal*`、`adminKeys.systemInstances/systemNpm`；新 `serviceStatusKeys`（`all` / global 面板 / `target(key)` / `metrics` / `api5xxEvents` / `instances` / `npm`）；新 `emailChangeKeys`（`all` / `byToken`）；`query-keys.test.ts` 同步
- `i18n-keys.ts` +`DEPLOY_STATUS_LABEL_KEY` / `QUOTA_ALERT_KIND_LABEL_KEY` / `RANGE_PRESET_LABEL_KEY`（按页保留原 `range_*` 文案）
- realtime-metrics / admin-metrics / version-health 改用上述工具，删本地 `ChartController`、`lineConfig`、presets；`email-change.tsx` 用 `emailChangeKeys`，reset 用 `matchQuery`
- `status-panel.tsx`：`AsyncLine`；刷新 = 一次 `invalidateQueries(serviceStatusKeys.target(key))`；去掉 `refetch` prop（index.tsx 同步）
- `instances-panel.tsx`：`scheduleInstancesRefresh()`（ref 计时器、卸载清理）；其余 panel 改 `serviceStatusKeys.*`

**D. manage 页内部**
- `useManageContext.tsx` 去掉 `deepLink/setDeepLink`（唯一消费者是 `TestQrCode`）
- `version-table.tsx`：`TestQrCode` 本地 state，`safeStorage` 读写 `${appId}_deeplink`，Popover 打开时重读；`TextColumn` 新增 `canPublish` prop（`getColumns(t, canPublish)`）
- `package-list.tsx`：`Item` 新增 `canPublish` prop；权限 query observer ~50 → 3
- `bind-package.tsx`：`DEPS_VIOLATION_MESSAGE_KEY` 查表
- 全局：所有 `onError: (e) => message.error(e.message)` 删除（MutationCache 兜底）；`globals.d.ts` 的手写 `bun:test` 类型补 `toMatchObject`

### 第三批 `089ec01` + `e17de14`：收尾 + 页面逻辑测试（cresc 已移植；差异：admin-users 用静态 tierOptions、audit-logs 无 alipayCallback 且 CSV 表头是固定常量 AUDIT_CSV_HEADER、bind-package 变更类型保持大写、无 instances-panel）
- 新 `src/utils/selected-app.ts`：`useSelectedAppFromUrl()` → `{ selectableApps, isAdmin, isLoadingApps, selectedAppKey, selectedApp, selectApp }`；realtime-metrics / version-health 改用
- `router.tsx` +`appViewPath(path, appKey?)`；三个页面的 ?appKey 跳转统一用它
- `helper.ts` +`filterAppsByQuery(apps, query)`（app-drawer、apps 页共用）+ 测试
- `version-table.tsx` 分页改 `getTablePagination` + `useIsMobile`
- 页面纯逻辑抽到同级 `*.logic.ts`：audit-logs（normalizePath / getActionMap / parseDateRange / isAuditDateDisabled / getDateRangePatch / buildAuditCsvRow …）、admin-metrics（getMetricsTotal / parseDateRange / getCategoryPrefix / buildChartPoints）、admin-users（parseQuotaInput / getExtendedTierExpiry / statusMeta …）、admin-apps（normalizeFilter / parsePlatformFilter …）、bind-package（getDepsChanges / getBindingRolloutState / canToggleForceBoot …）、useManageContext（getUnusedPackages / shouldLoadDiffStatus）、instances-panel（pickNodeDeployStatus …）、members（getMemberPermissions / canManageMember）、`user/quota-usage.ts`（buildQuotaUsageRows）；`table-state.ts` +`parseSortState` / `buildTableChangePatch`
- 新增 119 个测试（281 → 400）；nav-items 测试需本地 `mock.module('@/router')`（auth.test 的 mock 会跨文件泄漏）

## 剩余工作

三批全部完成并推送 main（gh-pages workflow 会跑 `build:check` 再部署；失败会由 `ci-failure-email.yml` 开 issue）。推送后确认两边 Actions 绿灯即可。

### 审计里有意未做 / 需人工决定
- `netlify.toml` 的缓存头在 GitHub Pages 上不生效，若 Netlify 已不用可删（未确认，未动）
- `daily-check-quota.tsx` / `user/index.tsx` 的 ``t(`user.purchasable_tiers.${tier}`)`` 是刻意的服务端 tier 回退逻辑，保留
- `lazy-chart.tsx` 的中文 UI 文案（`errorTitle="图表渲染异常"` 等）两仓库都有，cresc 侧值得补 i18n
- 57 处 `useMemo/useCallback` 在 React Compiler 下多余但无害，未清理
- `cresc-admin` 的 `node_modules/@ant-design/{charts,graphs}`、`@antv/g6` 目录是 bun 没清的残留，已不在 lockfile 与产物中
