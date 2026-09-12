# Analytics screenshot demo

Run `bun run dev:analytics` from this admin checkout, then open:

`http://127.0.0.1:19410/?lng=zh-CN#/realtime-metrics?appKey=demo-shiguang-android`

Sign in with `demo@example.com` and the dummy password `demo-only`.
No real credentials are required or used. The fixture API binds to loopback
on port 19411; the real development UI binds to port 19410. API CORS allows
only the matching local UI. The command exits when a UI port is occupied.
No production services, database writes, or production login changes are involved.
Other operations intentionally return 404. Stop both processes with Ctrl+C.

Two fictional apps have distinct traffic sizes. The Pushy dataset uses Chinese
commerce/lifestyle apps and Android versions; Cresc uses Atlas Travel / Orbit
Fitness, English release labels, iOS versions and international regions.
Data covers 35 days relative to startup. All counts are deterministic for a
given date and app. The primary app is used for the site screenshots.

## Capture workflow

Use the browser, sign in, select the app and hide the app drawer using its
visible Hide / 隐藏 control. The real navigation then retains the app name.
Capture at the browser's default 1280 × 720 viewport after charts finish rendering:

- `overview`: Overview, 7 days, at the top.
- `versions`: expand the newest bundle and scroll to its funnel, native-package
  table and both lag distributions.
- `traffic`: request hosts, IP versions and regional rankings.
- `traffic-hours`: hourly chart and native-package / network breakdowns.
- `failures`: select the middle bundle and show the failure-reason table.
- `failure-dimensions`: clear the bundle filter, then show OS and carrier tables.

Screenshots are real UI output, not recreated charts. Site assets live under
`site/pages/public/images/analytics/` in the corresponding site repository.
The homepage and `/docs/analytics` label all metrics as fictional demo data.
Convert captures losslessly with `cwebp -lossless input.png -o output.webp`.

The API honors appKey and day selection. Per-day distributions add up to request
counts; event OS/reason/carrier slices derive from the same version events.
Cumulative device and lag data are independent of day selection, as in the UI.
