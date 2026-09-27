import { expect, test } from 'bun:test';
import { buildFunnelRows } from './logic';

test('an explicit null observation object is unavailable, not legacy fallback', () => {
  // Exercise the actual JSON boundary, including a defensive null shape that
  // is not emitted by the v2 server but must not crash the whole panel.
  const payload = JSON.parse(
    JSON.stringify({
      versions: [
        {
          hash: 'v1',
          name: 'V1',
          adopted: { mark: 5, download: 5 },
          observed: null,
          served: { hdiff: 0, pdiff: 0, full: 0, fullPending: 0, exp: 0 },
          events: {
            downloadSuccess: 0,
            downloadFail: 0,
            patchFail: 0,
            markSuccess: 0,
            rollback: 0,
          },
          lag: { downloadSuccess: null, markSuccess: null },
          byPackage: [],
        },
      ],
    }),
  );
  expect(buildFunnelRows(payload)[0]?.retained).toMatchObject({
    mark: null,
    download: null,
  });
});
