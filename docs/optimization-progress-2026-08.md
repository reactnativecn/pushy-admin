# 2026-08 优化改造进度

来源：2026-08-25 对 pushy-admin 的全量审计（bundle 归因 + 代码审计），共 23 项，用户要求全部修。
本文记录已完成 / 待完成，以及移植到 cresc-admin 的对照清单。上下文断掉后从「剩余工作」一节接着做。

## 状态总览

| 仓库 | 已提交 | 待办 |
|---|---|---|
| pushy-admin | `a0a7830`（第一批）、`950ee19`（第二批） | 第三批（见下）；未推送 |
| cresc-admin | `0a02bd5`（第一批移植） | 第二批移植、第三批；未推送 |

验证基线（pushy-admin `950ee19`）：`bun run ci` 通过，281 tests；`CI=true bun run build:check` 产物 initial 1294 KB / async 3401 KB / total 4695 KB（改造前 5664 KB min、1761 KB gzip → 约 4824 KB / 1509 KB gzip）。

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

### 第二批 `950ee19`：页面级重构（cresc **未**移植）

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

## 剩余工作（按顺序做）

### 1. pushy-admin 第三批（未开始，工作区干净）
1. **version-table 分页复用**：`src/pages/manage/components/version-table.tsx` ~544（`Grid.useBreakpoint` → `useIsMobile()`）和 ~591 的 `pagination={{ ... }}` 改成 `{ ...getTablePagination({ isMobile, page: offset / pageSize + 1, pageSize }, count, (total) => t('version_table.total_versions', { total })), onChange(page, size) { ... } }`（该表用本地 offset/pageSize 而非 URL，所以只复用配置，不用 `useUrlTableState`）。
2. **应用选择页面壳去重**（审计第 21 项）：`realtime-metrics.tsx` ~160-201 与 `version-health.tsx` ~108-143 有相同的 `selectableAppKeys` / `selectedAppKey`（admin 可任意 key，否则必须在列表内）/ `selectedApp` / 「无选择时默认第一个 app 写入 URL」effect。抽 `useSelectedAppFromUrl()`（建议新文件 `src/utils/selected-app.ts`，基于 `useAppWorkspaceList` + `useSearchParams` + `patchSearchParams`），返回 `{ selectableApps, isAdmin, isLoadingApps, selectedAppKey, selectedApp, selectApp(appKey) }`。两页的 `AppDrawerLayout onSelect` 里 `rememberRecentApp + patchSearchParams` 也一样，可一并收进 hook。`manage/index.tsx` ~236-296 的 `AppDetailHeader` 跳转拼 URL 逻辑与两页 header 相似，可抽 `buildAppViewPath(view, appKey)` 放 `router.tsx` 旁。
3. **app 列表过滤去重**：`src/components/app-drawer.tsx` ~79-86 与 `src/pages/apps.tsx` ~49-55 相同的 `filteredApps`，抽 `filterAppsByQuery(apps, query)` 到 `src/utils/helper.ts` 并加测试。
4. **页面纯逻辑测试**（审计第 23 项，最耗时，可派 agent）：把下列内联逻辑抽成纯函数并测——`audit-logs.tsx`（`normalizePath` / `getActionKey` / `matchesStatusFilter` / `parseDateRange` / 180 天 `disabledDate` 与范围夹紧 / CSV 行映射）、`admin-metrics.tsx`（`getMetricsTotal` / `parseDateRange` 含 start>end 回退 / `getCategoryPrefix`）、`bind-package.tsx`（`getDepsChanges` / `getDepsChangeSummary` / rollout 菜单规则 / forceBoot rnu>=10.52.1 门槛）、`admin-users.tsx`（`getInitialQuotaValue` / `statusMeta` / 配额 JSON 解析）、`useManageContext.tsx`（`unusedPackages`）、`instances-panel.tsx`（`nodeDeployStatus` 优先级排序）、`user/index.tsx`（配额行计算）、`nav-items.tsx`（`getSelectedKeys`）、`members.tsx`（`canManage` / `isOwner`）、`version-table.tsx`（`getDeepLinkError` / `formatMetadata`）、`realtime-metrics.tsx`（`formatCategory`）。注意 `src/globals.d.ts` 手写了 `bun:test` 类型，需要新 matcher 时在那里加签名。
5. 收尾：`bun run ci` + `CI=true bun run build:check`，提交。

### 2. cresc-admin：移植第二批 `950ee19`（未开始）
按上面「第二批」逐条移植，方法：在 pushy-admin 里 `git show 950ee19 -- <file>` 看 hunk，先 `diff <(git show 950ee19~1:<file>) ../cresc-admin/<file>` 判断分叉程度——接近相同的文件（utils/charts.ts、metrics.ts、table-state.ts、responsive.ts、app-options.ts、token-*.tsx、new-token-reveal-modal.tsx 等新文件）直接复制 + 注释翻英文；分叉的页面手工套 hunk。已知差异：
- cresc 用全局 ambient 类型 `src/types.d.ts`，去掉 `import type { X } from '@/types'`
- 注释英文；`query-keys.ts` 更小；i18n 结构相同、英文文案可能不同
- cresc **没有** `admin-service-status/instances-panel.tsx`、`target-cards.tsx`（有 `cloudrun-panel.tsx`），对应的 query key / onError 改动套到 cloudrun-panel；跳过 `DEPLOY_STATUS_LABEL_KEY`（若无 deploy status 类型）
- MCP scope 名可能不同（pushy 是 `pushy:apps:read` / `pushy:diagnose`），用 cresc 自己的 scope 串和 i18n key
- 审计日志：先确认 cresc-server 的 audit 接口是否接受 `endDate`、返回 `total`；不支持就保留旧参数只做前端部分
- `globals.d.ts` 同样补 `toMatchObject`
- 验证：`bun run typecheck`、`bunx biome check .`、`bun test`、`CI=true bun run build:check`；然后提交（规则：admin 改动验证后直接 commit）

### 3. cresc-admin：第三批同步 + 两边推 main
pushy 第三批完成后同样移植；最后 `git push` 两个仓库的 main（gh-pages workflow 会自动 build:check + 部署，`ci-failure-email.yml` 失败会开 issue）。

### 4. 审计里有意未做 / 需人工决定
- `netlify.toml` 的缓存头在 GitHub Pages 上不生效，若 Netlify 已不用可删（未确认，未动）
- `daily-check-quota.tsx` / `user/index.tsx` 的 ``t(`user.purchasable_tiers.${tier}`)`` 是刻意的服务端 tier 回退逻辑，保留
- `lazy-chart.tsx` 的中文 UI 文案（`errorTitle="图表渲染异常"` 等）两仓库都有，cresc 侧值得补 i18n
- 57 处 `useMemo/useCallback` 在 React Compiler 下多余但无害，未清理
- `cresc-admin` 的 `node_modules/@ant-design/{charts,graphs}`、`@antv/g6` 目录是 bun 没清的残留，已不在 lockfile 与产物中
