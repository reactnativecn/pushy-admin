/** Local-only fixture API + real admin UI. No production data or credentials. */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const english =
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).name ===
  'cresc-admin';
const uiPort = english ? 19420 : 19410;
const apiPort = uiPort + 1;
const apps = english
  ? [
      {
        id: 201,
        name: 'Atlas Travel',
        platform: 'ios',
        appKey: 'demo-atlas-ios',
      },
      {
        id: 202,
        name: 'Orbit Fitness',
        platform: 'android',
        appKey: 'demo-orbit-android',
      },
    ]
  : [
      {
        id: 101,
        name: '拾光商城',
        platform: 'android',
        appKey: 'demo-shiguang-android',
      },
      { id: 102, name: '青禾生活', platform: 'ios', appKey: 'demo-qinghe-ios' },
    ];
const versions = english
  ? ['4.8.2', '4.8.1', '4.7.6']
  : ['3.6.2', '3.6.1', '3.5.8'];
const packages = english
  ? ['6.4.0', '6.3.0', '6.2.1']
  : ['5.2.0', '5.1.0', '5.0.2'];
const hashes = english
  ? ['e7a4318b98cd', 'b6c502af31de', 'd947ac06ef12']
  : ['a831f42c7d90', 'c26d91ea04b8', 'f7093ab6e412'];
const eventKeys = [
  'downloadSuccess',
  'downloadFail',
  'patchFail',
  'markSuccess',
  'rollback',
];
const eventTypes = [
  'download_success',
  'download_fail',
  'patch_fail',
  'mark_success',
  'rollback',
];
const date = (ago) =>
  new Date(Date.now() + 8 * 3600000 - ago * 86400000)
    .toISOString()
    .slice(0, 10);
const sum = (values) => values.reduce((a, b) => a + b, 0);
const counts = (total, shares) => {
  const result = shares.map((share) =>
    Math.floor((total * share) / sum(shares)),
  );
  result[0] += total - sum(result);
  return result;
};
const split = (total, names, shares) =>
  Object.fromEntries(names.map((name, i) => [name, counts(total, shares)[i]]));
const add = (items, keys) =>
  Object.fromEntries(
    keys.map((key) => [key, sum(items.map((item) => item[key]))]),
  );
const servedKeys = ['hdiff', 'pdiff', 'full', 'fullPending', 'exp'];
const carrierNames = english
  ? ['其他地区', '云', '其他', 'unknown']
  : ['移动', '电信', '联通', '广电', '其他地区'];
const regions = english
  ? [
      'US',
      'GB',
      'DE',
      'CA',
      'AU',
      'FR',
      'JP',
      'SG',
      'NL',
      'IN',
      'BR',
      'NZ',
      'SE',
    ]
  : [
      '广东',
      '浙江',
      '江苏',
      '上海',
      '北京',
      '四川',
      '山东',
      '湖北',
      '福建',
      '河南',
      '香港',
      'SG',
      'JP',
    ];
const seed = (appIndex = 0) =>
  Array.from({ length: 35 }, (_, ago) => {
    const factor =
      (english ? 0.74 : 1) *
      (appIndex ? 0.39 : 1) *
      (0.78 + (35 - ago) * 0.013) *
      (1 + Math.sin(ago * 1.73) * 0.1) *
      (ago === 0 ? 0.73 : 1);
    const requests = Math.round(168000 * factor);
    const hit = split(
      requests,
      [
        'uptodate',
        'hdiff',
        'pdiff',
        'full',
        'paused',
        'expired',
        'blocked',
        'unknown_package',
      ],
      [58 + ago * 0.4, 26 - ago * 0.25, 8, 5, 1.4, 0.6, 0, 0],
    );
    const perVersion = versions.map((name, i) => {
      const weight = [ago < 3 ? 0.66 : 0.35, 0.23, ago < 3 ? 0.11 : 0.42][i];
      const served = Object.fromEntries(
        servedKeys.map((key) => [
          key,
          key === 'fullPending'
            ? Math.round(hit.full * weight * 0.025)
            : key === 'exp'
              ? Math.round(hit.paused * weight)
              : Math.round(hit[key] * weight),
        ]),
      );
      const downloaded = Math.round(
        (served.hdiff + served.pdiff + served.full) * 0.83,
      );
      const events = {
        downloadSuccess: downloaded,
        downloadFail: Math.round(downloaded * (i === 1 ? 0.016 : 0.004)),
        patchFail: Math.round(downloaded * 0.0008),
        markSuccess: Math.round(downloaded * 0.95),
        rollback: Math.round(downloaded * (i === 1 ? 0.012 : 0.0003)),
      };
      return { hash: hashes[i], name, served, events };
    });
    const allEvents = add(
      perVersion.map((v) => v.events),
      eventKeys,
    );
    const osNames = english
      ? ['iOS 18.5', 'iOS 18.4', 'iOS 17.7']
      : ['Android 15', 'Android 14', 'Android 13'];
    const byOS = perVersion.flatMap((v) =>
      eventTypes.flatMap((type, ei) =>
        osNames.map((os, i) => ({
          type,
          hash: v.hash,
          name: v.name,
          os,
          count: counts(
            v.events[eventKeys[ei]],
            ei === 1 ? [0.23, 0.58, 0.19] : [0.58, 0.3, 0.12],
          )[i],
        })),
      ),
    );
    const byReason = perVersion.flatMap((v) =>
      [
        [
          'download_fail',
          'downloadFail',
          ['timeout', 'network', 'no_space'],
          [8, 1.5, 0.5],
        ],
        ['patch_fail', 'patchFail', ['crc_mismatch', 'patch_apply'], [7, 3]],
        ['rollback', 'rollback', ['empty'], [1]],
      ].flatMap(([type, key, reasons, shares]) =>
        reasons.map((reason, i) => ({
          type,
          hash: v.hash,
          name: v.name,
          reason,
          count: counts(v.events[key], shares)[i],
        })),
      ),
    );
    return {
      traffic: {
        date: date(ago),
        requests,
        dau: Math.round(requests / (english ? 4.7 : 5.8)),
        hourly: counts(
          requests,
          Array.from(
            { length: 24 },
            (_, h) =>
              8 +
              30 * Math.exp(-((h - (english ? 15 : 20)) ** 2) / 10) +
              18 * Math.exp(-((h - 12) ** 2) / 8),
          ),
        ),
        hit,
        ipVersion: split(requests, ['v4', 'v6'], english ? [64, 36] : [39, 61]),
        hosts: split(
          requests,
          english
            ? ['api.cresc.dev', 'ota.atlas.example']
            : ['update.reactnative.cn', 'update.react-native.cn'],
          [82, 18],
        ),
        carriers: split(
          requests,
          carrierNames,
          english ? [84, 9, 6, 1] : [43, 27, 23, 3, 4],
        ),
        packages: packages.map((packageVersion, i) => ({
          packageVersion,
          requests: counts(requests, [68, 24, 8])[i],
          devices: counts(Math.round(requests / 5), [68, 24, 8])[i],
        })),
      },
      geo: {
        date: date(ago),
        requests,
        regions: split(
          requests,
          regions,
          [23, 16, 13, 11, 9, 7, 5, 4, 3, 3, 2, 2, 2],
        ),
      },
      breakdown: {
        date: date(ago),
        byOS,
        byReason,
        byCarrier: eventTypes.flatMap((type, ei) =>
          carrierNames.map((carrier, i) => ({
            type,
            carrier,
            count: counts(
              allEvents[eventKeys[ei]],
              english ? [84, 9, 6, 1] : [43, 27, 23, 3, 4],
            )[i],
          })),
        ),
      },
      versions: perVersion,
    };
  });
const fixtures = apps.map((_, i) => seed(i));
function payload(url) {
  const selected = Math.max(
    0,
    apps.findIndex((app) => app.appKey === url.searchParams.get('appKey')),
  );
  const rows = fixtures[selected];
  const days = Math.min(
    35,
    Math.max(1, Number(url.searchParams.get('days')) || 7),
  );
  const window = rows.slice(0, days);
  switch (url.pathname) {
    case '/status':
      return { status: 'ok', version: 'local-demo' };
    case '/user/me':
      return {
        id: 9001,
        email: 'demo@example.com',
        name: english ? 'Atlas Studio' : '拾光团队',
        tier: 'premium',
        admin: false,
        checkQuota: 10000000,
        tierExpiresAt: '2030-12-31',
        serverTime: new Date().toISOString(),
      };
    case '/app/list':
      return {
        data: apps.map((app, i) => ({
          ...app,
          status: 'normal',
          checkCount: fixtures[i][0].traffic.requests,
        })),
      };
    case '/member/workspaces':
      return { data: [] };
    case '/metrics/app/traffic':
      return { days: window.map((row) => row.traffic), retentionDays: 35 };
    case '/metrics/app/geo':
      return {
        days: window.map((row) => row.geo),
        retentionDays: 30,
        regionResolver: true,
      };
    case '/metrics/app/events/breakdown':
      return { days: window.map((row) => row.breakdown), retentionDays: 35 };
    case '/metrics/app/versions':
      return {
        days,
        start: date(days - 1),
        end: date(0),
        hourlyFrom: date(2),
        dauToday: rows[0].traffic.dau,
        versions: versions.map((name, i) => {
          const selectedRows = window.map((row) => row.versions[i]);
          const lifetime = add(
            rows.map((row) => row.versions[i].events),
            eventKeys,
          );
          const served = add(
            selectedRows.map((row) => row.served),
            servedKeys,
          );
          const events = add(
            selectedRows.map((row) => row.events),
            eventKeys,
          );
          const adoption = Math.round(
            rows[0].traffic.dau * [0.81, 0.14, 0.05][i],
          );
          const lag = (total, shares) =>
            split(
              total,
              ['lt1h', '1h-6h', '6h-24h', '1d-3d', '3d-7d', 'gt7d'],
              shares,
            );
          return {
            hash: hashes[i],
            name,
            served,
            events,
            adopted: {
              mark: adoption,
              download: Math.round(adoption / [0.977, 0.824, 0.943][i]),
            },
            lag: {
              downloadSuccess: lag(
                lifetime.downloadSuccess,
                [64, 23, 8, 3, 1, 1],
              ),
              markSuccess: lag(lifetime.markSuccess, [52, 28, 13, 4, 2, 1]),
            },
            byPackage: packages.map((packageVersion, pi) => ({
              packageVersion,
              served: Object.fromEntries(
                servedKeys.map((key) => [
                  key,
                  counts(served[key], [68, 24, 8])[pi],
                ]),
              ),
              events: Object.fromEntries(
                eventKeys.map((key) => [
                  key,
                  counts(events[key], [68, 24, 8])[pi],
                ]),
              ),
            })),
          };
        }),
      };
    case '/metrics/app': {
      const dict = [
        '_total',
        ...versions.map((v) => `hash\u001f${v}`),
        ...packages.map(
          (v) => `packageVersion_buildTime\u001f${v}_1788220800000`,
        ),
      ];
      const end = new Date(url.searchParams.get('end') || Date.now()).getTime();
      const start = new Date(
        url.searchParams.get('start') || end - 86400000,
      ).getTime();
      return {
        dict,
        data: Array.from({ length: 96 }, (_, i) => {
          const total = Math.round(1400 + 800 * Math.sin(i / 7) + i * 8);
          return {
            time: new Date(start + ((end - start) * i) / 95).toISOString(),
            data: [
              total,
              ...counts(total, [65 + i * 0.3, 25, 10]),
              ...counts(total, [68, 24, 8]),
            ].map((value, key) => [key, value]),
          };
        }),
      };
    }
    default:
      return null;
  }
}
const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const allowed = [`http://127.0.0.1:${uiPort}`, `http://localhost:${uiPort}`];
  if (origin && !allowed.includes(origin)) {
    res.writeHead(403);
    res.end();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', origin || allowed[0]);
  res.setHeader(
    'Access-Control-Allow-Headers',
    'content-type,x-accesstoken,x-account-id',
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, `http://127.0.0.1:${apiPort}`);
  if (req.method === 'POST' && url.pathname === '/user/login') {
    res.end(JSON.stringify({ token: 'local-demo-no-production-access' }));
    return;
  }
  const result = req.method === 'GET' ? payload(url) : null;
  if (result === null) {
    res.writeHead(404);
    res.end(
      JSON.stringify({
        message: 'This action is not part of the local analytics demo.',
      }),
    );
    return;
  }
  res.end(JSON.stringify(result));
});
server.listen(apiPort, '127.0.0.1', () => {
  console.log(
    `Local ${english ? 'Cresc' : 'Pushy'} analytics demo: http://127.0.0.1:${uiPort}/?lng=${english ? 'en' : 'zh-CN'}#/realtime-metrics?appKey=${apps[0].appKey}`,
  );
  console.log(
    'Sign in with demo@example.com and any dummy password. All data is fictional.',
  );
});
const child = spawn(
  'bun',
  [
    'x',
    'rsbuild',
    'dev',
    '--strict-port',
    '--host',
    '127.0.0.1',
    '--port',
    String(uiPort),
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      PUBLIC_API: `http://127.0.0.1:${apiPort}`,
      NODE_ENV: 'development',
    },
  },
);
const stop = () => {
  child.kill();
  server.close();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', () => server.close());
