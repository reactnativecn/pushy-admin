import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { insightsEn, insightsZh } from '../../src/i18n/insights-metrics';

function productionSources(dir: string): string {
  return readdirSync(dir, { withFileTypes: true }).map((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return productionSources(path);
    return /\.tsx?$/.test(path) && !path.includes('.test.') && !path.endsWith('insights-metrics.ts')
      ? readFileSync(path, 'utf8') : '';
  }).join('\n');
}
const copy = {
  en: {
    breakdown_unavailable: 'Failure report data is unavailable; absence cannot establish zero failures.',
    breakdown_availability: 'Available observation days: {{available}} / {{total}}; unavailable: {{unavailable}}. Unavailable days are excluded, not filled with zero.',
    breakdown_legacy_days: '{{days}} legacy days lack availability metadata; only positive reported observations are usable.',
    no_reports_in_scope: 'No reports observed in this filter; this is not an overall health conclusion.',
    window_business_legacy: 'Legacy API lacks business timezone and availability metadata. Today falls back to UTC+8; ambiguous zero-device counts are excluded, not treated as observed zeroes.',
    versions_glance_question: 'Returned versions ranked by offered targets and client reports in the window, not by release time.',
    hourly_footnote: 'Hours in the business timezone above, summed from available hourly observations independently of request totals. Today is incomplete, so hours can have unequal observation durations.',
  },
  'zh-CN': {
    breakdown_unavailable: '失败事件数据不可用，不能据此判断为零失败。',
    breakdown_availability: '可用观测日 {{available}} / {{total}}；不可用 {{unavailable}} 日。不可用日已排除，不补零。',
    breakdown_legacy_days: '{{days}} 个旧接口日桶缺少可用性状态；仅保留有上报证据的观测。',
    no_reports_in_scope: '当前筛选范围未观测到报告，不代表整体健康。',
    window_business_legacy: '旧接口未提供业务时区与可用性元数据；今日标记暂按 UTC+8，含义不明的零设备数已排除，不作为有效零值。',
    versions_glance_question: '在返回的版本中按窗口内提供目标与客户端事件总量排序，不是按发布时间排序。',
    hourly_footnote: '按上方业务时区小时累加，使用独立于请求总量的小时观测。包含尚未结束的今天，各小时可观测时长可能不同。',
  },
};
const obsolete = ['reason_other_detail', 'health_healthy', 'health_warning', 'health_critical',
  'col_coverage', 'coverage_hint', 'coverage_footnote', 'adoption_rate', 'adoption_rate_hint',
  'adoption_rate_footnote', 'col_adoption_rate'];
const sources = productionSources('src');
for (const [language, overrides] of [['en', insightsEn], ['zh-CN', insightsZh]] as const) {
  const path = `src/i18n/locales/${language}.json`;
  const catalog = JSON.parse(readFileSync(path, 'utf8'));
  catalog.app_insights = { ...catalog.app_insights, ...overrides, ...copy[language] };
  for (const key of obsolete) {
    if (sources.includes(`app_insights.${key}`)) throw new Error(`Obsolete key still used: ${key}`);
    delete catalog.app_insights[key];
  }
  writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
writeFileSync('src/i18n/resources.ts', `import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

// Canonical JSON catalogs are the single source for runtime and validation.
export const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
};
`);
unlinkSync('src/i18n/insights-metrics.ts');
