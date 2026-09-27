// Metric-contract copy is kept together so both languages share the same
// definitions. Registered over the legacy app_insights resource at startup.
export const insightsZh = {
  view_versions: '版本事件',
  live: '每分钟刷新',
  today_requests: '今日查询热更请求',
  today_dau: '今日查询热更设备',
  dau: '查询热更设备',
  dau_hint: '完成更新检查并上报 UUID 的设备估算，不是全部 App 用户',
  peak_dau: '可用日桶中的峰值查询设备',
  window_requests: '近 {{days}} 个日桶观测请求',
  daily_average: '完整日均 {{value}}（可用 {{samples}} / {{days}} 日）',
  dau_average: '完整日均 {{value}}（可用 {{samples}} / {{days}} 日）',
  means_note:
    '两个日均都排除今天；有效零值计入，缺失值排除。可用日数不代表采集完整。',
  window_exact: '{{timezone}}：{{start}} 至 {{end}}（起含止不含）',
  window_utc_legacy: '旧接口：版本事件按 UTC 自然日；未提供精确窗口元数据。',
  window_business_legacy:
    '旧接口未提供业务时区与可用性元数据；今日标记暂按 UTC+8，零值可能包含未采集数据。',
  last_refreshed: '最近成功读取：{{time}}；页面每分钟刷新',
  not_loaded: '尚未读取到数据',
  stale_data: '刷新失败，以下为上次成功读取的数据',
  best_effort:
    '以下为尽力采集的运行观测，可能重复或遗漏；无数据不等于没有设备、没有故障。',
  no_observations: '没有可用观测，不能据此判断为零或正常',
  today_live: '今日未完成日桶',
  daily_footnote: '按上方时区的自然日统计；今天尚未结束，缺失设备数据不补零。',
  hit_uptodate: '未提供更新',
  hit_hdiff: '提供 hdiff 选项',
  hit_pdiff: '提供 pdiff 选项',
  hit_full: '提供整包选项',
  hit_paused: '暂停或检查受限',
  hit_expired: '原生包已过期',
  outcome_footnote:
    '未提供更新包括已运行目标版本和未绑定版本；暂停或受限可能来自应用、原生包或额度。提供下载选项不代表客户端已经下载。',
  update_share_hint: '提供了更新选项的请求占比，不是升级成功率',
  refusal_blocked:
    '构建信息不匹配：核对客户端构建与已登记原生包，不应仅为消除告警而关闭校验。',
  refusal_unknown_package:
    '当前未匹配到已登记的原生包；核对 App Key、版本与原生包上传记录。',
  refused_packages_unattributed:
    '另有 {{count}} 次无可用原生包拆分，可能来自历史采集或明细缺失。',
  versions_glance_title: '事件量最高的版本',
  versions_glance_question:
    '按窗口内提供目标与客户端事件总量排序，不是按发布时间排序。',
  glance_line:
    '提供目标 {{served}} 次 · 激活报告 {{activated}} 次 · 下载/Patch 失败 {{failed}} 次 · 回滚 {{rollback}} 次',
  observed_glance: '留存累计激活设备观测',
  col_served: '提供目标次数',
  col_downloaded: '下载成功事件',
  col_activated: '激活成功事件',
  col_download_fail: '下载失败事件',
  col_patch_fail: 'Patch 失败事件',
  col_rollback: '回滚事件',
  col_rollback_rate: '回滚报告占比',
  col_failure_rate: '下载/Patch 失败事件占比',
  col_health: '回滚观测',
  served_exp: '实验版本选项（不代表灰度命中）',
  events_not_funnel:
    '各项是未关联的事件次数，不是转化漏斗。一次响应可提供主版本和实验选项；Patch 失败后整包成功会产生两类报告。',
  funnel_table_title: '版本更新事件',
  funnel_title: '独立事件计数',
  retained_title: '留存累计设备与事件到达分布',
  retained_scope:
    '整个热更版本的累计观测，不受天数筛选影响；不是当前正在运行该版本的设备。',
  retained_unavailable_package:
    '累计设备和时间分布没有原生包维度，已在原生包筛选下隐藏。',
  adopted_mark: '留存累计激活设备观测',
  adopted_download: '留存累计下载设备观测',
  retained_hint:
    'HLL 近似去重；35 天不活动可过期重计，缺失 UUID 或报告可能导致遗漏。',
  lag_download: '版本创建后下载成功报告到达时间',
  lag_mark: '版本创建后激活成功报告到达时间',
  lag_footnote:
    '按报告次数分布，不是首次激活设备数；起点是版本创建，不是绑定发布时间或下载开始。时间桶 90 天不活动可过期重计。',
  rollback_low: '回滚报告占比较低',
  rollback_warning: '回滚报告占比需关注',
  rollback_high: '回滚报告占比较高',
  insufficient_samples: '回滚观测样本不足（{{count}} / {{minimum}}）',
  rollback_only:
    '仅描述回滚报告：回滚 ÷（激活成功 + 回滚），不代表整体健康。达到 10 个报告后按 1% / 5% 提示。',
  totals_all: '应用整体观测汇总（不受下方筛选或前 50 个版本截断影响）',
  totals_returned: '旧接口：仅返回版本的小计，不是应用整体总量',
  versions_in_window: '有事件的版本数',
  window_served: '提供目标选项总次数',
  window_rollbacks: '回滚报告总次数',
  totals_unattributed:
    '其中无法归属版本：提供目标 {{offers}} 次，客户端报告 {{reports}} 次（已包含在汇总中）',
  filtered_note:
    '下表仅显示当前版本/原生包筛选；上方汇总仍为应用整体或返回版本小计。',
  request_share: '请求占比',
  packages_question: '哪些原生包在查询更新？请求占比不是装机占比。',
  col_peak_devices: '可用观测日中的设备峰值',
  col_availability: '设备观测范围与状态',
  package_observed_days: '可用 {{count}} 日：{{start}} 至 {{end}}',
  package_missing_days: '过期 {{expired}} 日；无可用观测 {{missing}} 日',
  package_partial: '触及采集限制，部分数据',
  packages_footnote:
    '请求保留 {{requests}} 天，设备观测保留 {{devices}} 天。峰值仅来自可用日，不代表整个所选窗口；没有设备观测不能解释为无人使用。',
  hourly_footnote:
    '按上方业务时区小时累加。包含尚未结束的今天，各小时可观测时长可能不同。',
  failure_events: '近 {{days}} 日桶已分类失败事件',
  failure_events_hint:
    '来自原因分类聚合：下载失败、Patch 失败和回滚；不是失败设备数。',
  worst_os: '失败事件占比最高的平台（至少 10 个报告）',
  no_ranked_os: '没有达到样本门槛且失败占比大于零的平台',
  rates_footnote:
    '失败事件占比 = (下载失败 + Patch 失败) ÷ (下载成功 + 下载失败 + Patch 失败)。回滚占比 = 回滚 ÷ (激活成功 + 回滚)。括号显示分子/分母；均不是最终升级失败率。',
  reasons_footnote:
    '原因由上报内容启发式归类；其他不展示自由文本前缀。未提供原因不是具体根因。各维度独立聚合，可能因采集遗漏而不完全对齐。',
  breakdown_footnote:
    '按上方业务时区日桶，最多保留 {{retention}} 天；仅包含支持遥测并成功上报的 SDK 事件，不能代表所有设备。',
  version_deleted: '未命名或已删除的版本',
  version_deleted_hint: '当前未解析到名称，不能仅凭空名称确认已删除。',
};

export const insightsEn: Record<keyof typeof insightsZh, string> = {
  view_versions: 'Version events',
  live: 'Refreshes every minute',
  today_requests: 'Update checks today',
  today_dau: 'Devices checking for updates today',
  dau: 'Devices checking for updates',
  dau_hint: 'Estimated UUIDs in completed update checks, not all app users',
  peak_dau: 'Peak devices among available day observations',
  window_requests: 'Observed checks in {{days}} calendar buckets',
  daily_average:
    'Complete-day mean {{value}} (available {{samples}} / {{days}} days)',
  dau_average:
    'Complete-day mean {{value}} (available {{samples}} / {{days}} days)',
  means_note:
    'Both means exclude today. Valid zeroes count; unavailable values do not. Available days do not imply complete collection.',
  window_exact:
    '{{timezone}}: {{start}} to {{end}} (start inclusive, end exclusive)',
  window_utc_legacy:
    'Legacy API: version events use UTC calendar days; exact window metadata is unavailable.',
  window_business_legacy:
    'Legacy API lacks business timezone and availability metadata. Today falls back to UTC+8; zeroes may include uncollected data.',
  last_refreshed: 'Last successful read: {{time}}; refreshes every minute',
  not_loaded: 'No successful read yet',
  stale_data: 'Refresh failed; showing the last successful read',
  best_effort:
    'Best-effort observations may be duplicated or missing. No data does not establish zero devices or no failures.',
  no_observations:
    'No available observations; this does not establish zero or healthy',
  today_live: 'Today, incomplete calendar bucket',
  daily_footnote:
    'Calendar days in the timezone above. Today is incomplete; missing device data is not filled with zero.',
  hit_uptodate: 'No update offered',
  hit_hdiff: 'hdiff option offered',
  hit_pdiff: 'pdiff option offered',
  hit_full: 'Full bundle option offered',
  hit_paused: 'Paused or checks restricted',
  hit_expired: 'Native package expired',
  outcome_footnote:
    'No update includes already-current and no bound version. Restrictions can come from the app, native package or quota. An offered option is not a completed download.',
  update_share_hint:
    'Share of requests offering an update option, not upgrade success',
  refusal_blocked:
    'Build identity mismatch: verify the client build and registered native package rather than disabling validation just to remove the warning.',
  refusal_unknown_package:
    'No registered native package matched. Check the App Key, version and uploaded package records.',
  refused_packages_unattributed:
    '{{count}} requests lack an available package breakdown, including historical or missing detail.',
  versions_glance_title: 'Highest-volume versions',
  versions_glance_question:
    'Ranked by offered targets and client reports in the window, not by release time.',
  glance_line:
    '{{served}} targets offered · {{activated}} activation reports · {{failed}} download/Patch failures · {{rollback}} rollbacks',
  observed_glance: 'Retained cumulative activation UUID estimate',
  col_served: 'Targets offered',
  col_downloaded: 'Download-success reports',
  col_activated: 'Activation-success reports',
  col_download_fail: 'Download-failure reports',
  col_patch_fail: 'Patch-failure reports',
  col_rollback: 'Rollback reports',
  col_rollback_rate: 'Rollback report share',
  col_failure_rate: 'Download/Patch failure report share',
  col_health: 'Rollback observations',
  served_exp: 'Experimental option (not gray-rollout participation)',
  events_not_funnel:
    'Independent report counts, not a conversion funnel. One response may offer main and experimental targets. Patch failure followed by full recovery produces both failure and success reports.',
  funnel_table_title: 'Version update events',
  funnel_title: 'Independent event counts',
  retained_title: 'Retained cumulative devices and report arrival bins',
  retained_scope:
    'Whole-version retained observations, independent of the day filter; not devices currently running this version.',
  retained_unavailable_package:
    'Retained device counts and arrival bins have no native-package dimension and are hidden under this filter.',
  adopted_mark: 'Retained cumulative activation UUID estimate',
  adopted_download: 'Retained cumulative download UUID estimate',
  retained_hint:
    'Approximate HLL counts can reset after 35 inactive days. Missing UUIDs or reports can omit devices.',
  lag_download: 'Download-success report arrival after version creation',
  lag_mark: 'Activation-success report arrival after version creation',
  lag_footnote:
    'Shares of reports, not first-activated devices. Origin is version creation, not binding publication or download start. Bins can reset after 90 inactive days.',
  rollback_low: 'Low rollback report share',
  rollback_warning: 'Elevated rollback report share',
  rollback_high: 'High rollback report share',
  insufficient_samples:
    'Insufficient rollback observations ({{count}} / {{minimum}})',
  rollback_only:
    'Rollback / (activation success + rollback), not overall health. With at least 10 reports, 1% / 5% are the warning thresholds.',
  totals_all:
    'App-wide observed totals, independent of the filters and top-50 presentation cap',
  totals_returned: 'Legacy API: returned-version subtotal, not app-wide totals',
  versions_in_window: 'Versions with events',
  window_served: 'Total target options offered',
  window_rollbacks: 'Total rollback reports',
  totals_unattributed:
    'Included but unattributed: {{offers}} offered targets and {{reports}} client reports',
  filtered_note:
    'The table follows the version/package filters; the summary above remains app-wide or a returned-version subtotal.',
  request_share: 'Request share',
  packages_question:
    'Which native packages check for updates? Request share is not installation share.',
  col_peak_devices: 'Peak among available device observations',
  col_availability: 'Device observation range and status',
  package_observed_days: '{{count}} available days: {{start}} to {{end}}',
  package_missing_days:
    '{{expired}} expired days; {{missing}} unavailable days',
  package_partial: 'Collection limit reached; partial data',
  packages_footnote:
    'Requests are retained {{requests}} days; devices {{devices}} days. Peaks cover available observations only, not necessarily the selected window. Missing devices do not establish an unused package.',
  hourly_footnote:
    'Hours in the business timezone above, summed across days. Today is incomplete, so hours can have unequal observation durations.',
  failure_events: 'Classified failure reports in {{days}} calendar buckets',
  failure_events_hint:
    'Reason aggregates: download failures, Patch failures and rollbacks, not failed devices.',
  worst_os: 'Highest failure report share (at least 10 reports)',
  no_ranked_os:
    'No platform has both enough samples and a positive failure share',
  rates_footnote:
    'Failure share = (download failures + Patch failures) / (download successes + download failures + Patch failures). Rollback share = rollbacks / (activation successes + rollbacks). Parentheses show numerator/denominator; neither is final upgrade failure rate.',
  reasons_footnote:
    'Reasons are heuristic classifications. Other omits free-text prefixes. Missing detail is not a diagnosed cause. Dimensions are independently aggregated and may differ due to collection loss.',
  breakdown_footnote:
    'Business calendar buckets above, retained up to {{retention}} days. Only supported SDK events successfully reported are observed; not all devices.',
  version_deleted: 'Unnamed or deleted version',
  version_deleted_hint: 'A missing name does not by itself prove deletion.',
};
