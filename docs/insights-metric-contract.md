# Insights observation contract correction

Companion server PR: https://github.com/reactnativecn/pushy-go/pull/17

## Decisions

The page describes best-effort observations, not an exactly-once update ledger. Delete coverage = retained activation UUIDs / today's check UUIDs and retained activation/download conversion. Do not cap them at 100% or substitute another unrelated denominator. Retained device observations are approximate positive counts, with missing/expired values shown unavailable; key lifetime is not permanent all-time or rolling-window coverage.

Version events are independent reports and target options. Main and experiment can coexist in one response; an experiment offer is not client selection. Patch failure followed by full recovery can generate both failure and success. Display each stage separately, and label report shares with their numerator, denominator and sample size. Rollback classification is explicitly rollback-only, never overall health. Low samples are visible; download/Patch failures remain separate columns.

Traffic and failures keep their business-calendar window; historical version events keep their UTC-calendar window. Those UTC daily rollups cannot be shifted losslessly by eight hours. Each section shows the server's exact inclusive/exclusive bounds and last successful UI refresh. Legacy servers have an explicit timezone/availability warning. UI refresh is 60 seconds, not the writer's one-second flush interval. True unified historical windows need a separate collection/retention migration, not a frontend date-label change.

Both request/device means exclude the current partial day, include known valid zeroes and exclude explicitly unavailable values. Their actual included/eligible day counts are shown. Requests, reports, UUID estimates and people are not interchangeable.

The server summary is computed before top-50 truncation and includes unattributed event subsets. The console uses it for app-wide totals; legacy responses are labelled returned-version subtotals. Table filters are distinct from the app summary. Package-filtered detail hides cumulative observations because there is no package dimension. The version glance is explicitly ranked by event volume, not release recency.

Native package request share is not installation share. Device peaks include only available observations. The page consumes the server's nullable device values, partial/expired/unavailable status, tracking-limit marker and separate 14-day device retention (requests retain 35 days). A missing device estimate is never a reason to infer the package is unused.

No-update includes already-current and no bound version. Paused/restricted can be app, package or quota. Expired identifies a native package. Existing aggregate data cannot establish a more specific reason. Failure reason free-text prefixes from legacy servers are normalized to `other` before display.

## Compatibility and rollout

Deploy pushy-go #17 first, then this console. All server fields are additive; the console continues to operate with old payloads and labels their limitations. No billing, rollout decisions, auto-pause rules, client protocol, retention TTL, production data or schema is mutated. Existing realtime series, release insights and region sections retain their independent time controls.

Metric-contract translations are grouped in `src/i18n/insights-metrics.ts`. Runtime registration and locale validation import the same side-effect-free `src/i18n/resources.ts` catalog. Tests retain base JSON key parity, validate effective bilingual key parity and all static source references, and reject plain-text rendering of tagged translations in either language.

## Verification

Unit regressions cover zero days, unavailable values, partial today, supplied business date, independently retained UUID sets, package filters, old/new payloads, top-N summaries, unlinked patch recovery, sample thresholds and old failure labels. Render tests cover rollback-only wording, hidden out-of-scope retained metrics, the former 250% scenario, legacy totals, stale windows and package observation states.

The existing CI gates remain unchanged: typecheck, lint, tests, production build and bundle-size limits. Temporary formatting diagnostics used during development have been removed from the final workflow diff.

## Not fabricated by this correction

Current version device share, linked-attempt upgrade conversion, first-device activation latency and exact gray participation need their own observation sets or client-attempt correlation. This change removes unsupported claims instead of inventing those measurements.
