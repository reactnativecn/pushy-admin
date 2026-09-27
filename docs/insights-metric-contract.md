# Insights observation contract correction

Companion server PR: https://github.com/reactnativecn/pushy-go/pull/17

## Decisions

The page describes best-effort observations, not an exactly-once update ledger. Delete coverage = retained activation UUIDs / today's check UUIDs and retained activation/download conversion. Do not cap them at 100% or substitute another unrelated denominator. Retained device observations are approximate positive counts, with missing/expired values shown unavailable; key lifetime is not permanent all-time or rolling-window coverage.

Version events are independent reports and target options. Main and experiment can coexist in one response; an experiment offer is not client selection. Patch failure followed by full recovery can generate both failure and success. Display each event separately, and label report shares with their numerator, denominator and sample size. Rollback classification is explicitly rollback-only, never overall health. Low samples are visible; download/Patch failures remain separate columns. The 1%/5% rollback thresholds and minimum sample count are shared with the service-status panel in `src/constants/metric-thresholds.ts`; rollback labels use the shared translation-key map and precomputed row values.

Traffic and failures keep their business-calendar window; historical version events keep their UTC-calendar window. Those UTC daily rollups cannot be shifted losslessly by eight hours. Each section shows the server's exact inclusive/exclusive bounds and last successful UI refresh. Legacy servers have an explicit timezone/availability warning. UI refresh is 60 seconds, not the writer's one-second flush interval. True unified historical windows need a separate collection/retention migration, not a frontend date-label change.

Both request/device means exclude the current partial day, include known valid zeroes and exclude explicitly unavailable values. A device count of zero without availability metadata is ambiguous and is excluded; a zero with `dauStatus: observed` is valid. Positive legacy UUID observations remain usable. Their actual included/eligible day counts are shown. Requests, reports, UUID estimates and people are not interchangeable.

Request-based ratios use the same available request days for numerator and denominator. Days with unavailable or invalid request totals do not contribute hit outcomes, native-package request counts or refused-package details. Independently collected hourly, host, carrier and device observations are retained in their own series. An hourly chart is shown according to its own nonzero observations, not according to the request total. Package request counts/shares with no usable request population are unavailable, not fabricated zeroes.

The server summary is computed before top-50 truncation and includes unattributed event subsets. The console uses it for app-wide totals; legacy responses are labelled returned-version subtotals. Table filters are distinct from the app summary. Package-filtered detail hides cumulative observations because there is no package dimension. The version glance sorts returned candidates by offered targets plus all client report counts, with hash as a deterministic tie-breaker, before taking five entries. It never mutates cached API rows or promises to include versions omitted by the server.

Native package request share is not installation share. Device peaks include only available observations. The page consumes the server's nullable device values, partial/expired/unavailable status, tracking-limit marker and separate 14-day device retention (requests retain 35 days). A missing device estimate is never a reason to infer the package is unused.

No-update includes already-current and no bound version. Paused/restricted can be app, package or quota. Expired identifies a native package. Existing aggregate data cannot establish a more specific reason. All unrecognized failure reasons, including legacy free-text prefixes and future categories, are normalized to a single `other` identity before grouping, preserving event-type and version subtotals.

Failure breakdown availability is evaluated before version filtering. Explicitly unavailable buckets are excluded from every dimension even when leftover numeric arrays are present. An explicitly observed empty bucket is usable; a legacy empty bucket is not evidence of zero failures. Legacy buckets with positive report evidence remain usable with a metadata warning. The UI shows available/total/unavailable day counts; an entirely unavailable window renders unavailable, whereas an observed empty filter states only that no reports were observed in that filter, not that the application is healthy.

## Compatibility and rollout

Deploy pushy-go #17 first, then this console. All server fields are additive; the console continues to operate with old payloads and labels their limitations. No billing, rollout decisions, auto-pause rules, client protocol, retention TTL, production data or schema is mutated. Existing realtime series, release insights and region sections retain their independent time controls.

Metric-contract translations live directly in the canonical `src/i18n/locales/en.json` and `zh-CN.json` catalogs. The duplicate runtime override file has been removed. Runtime registration and locale validation import the same side-effect-free `src/i18n/resources.ts` catalog. Tests retain base JSON key parity, validate bilingual key parity and static source references, reject plain-text rendering of tagged translations, and assert that runtime resources are the canonical JSON objects.

## Verification

Unit regressions cover zero days, unavailable values, partial today, supplied business date, independently retained UUID sets, package filters, old/new payloads, top-N summaries, unlinked patch recovery, sample thresholds and old failure labels. Review regressions additionally cover matching request populations, invalid denominators, legacy versus explicit UUID zeroes, all/mixed/legacy breakdown availability, unknown-category coalescing, non-mutating ranking and inclusive rollback threshold boundaries.

Render tests cover rollback-only wording, hidden out-of-scope retained metrics, the former 250% scenario, legacy totals, stale windows and package observation states. They also distinguish entirely unavailable failures from explicitly observed empty buckets, preserve observed failures in mixed windows, and display legacy availability warnings in Chinese.

The existing CI gates remain unchanged: typecheck, lint, tests, production build and bundle-size limits. One-off repair helpers and workflows used to apply and validate the edits have been removed from the final branch.

## Not fabricated by this correction

Current version device share, linked-attempt upgrade conversion, first-device activation latency and exact gray participation need their own observation sets or client-attempt correlation. This change removes unsupported claims instead of inventing those measurements.
