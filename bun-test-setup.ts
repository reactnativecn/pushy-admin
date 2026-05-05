import { mock } from 'bun:test';
import { plugin } from 'bun';
import { GlobalWindow } from 'happy-dom';

plugin({
  name: 'svg-loader',
  setup(builder) {
    builder.onLoad({ filter: /\.svg$/ }, () => {
      return {
        exports: { ReactComponent: () => null, default: '' },
        loader: 'object',
      };
    });
  },
});

const win = new GlobalWindow({ url: 'http://localhost' });
global.window = win as any;
global.document = win.document as any;
global.navigator = win.navigator as any;
global.localStorage = win.localStorage as any;
global.addEventListener = win.addEventListener.bind(win) as any;
global.removeEventListener = win.removeEventListener.bind(win) as any;
global.dispatchEvent = win.dispatchEvent.bind(win) as any;
global.StorageEvent = win.StorageEvent as any;
global.location = win.location as any;

// Mock dependencies that cause side effects or fail on static assets imports
mock.module('@/services/api', () => ({
  api: {},
}));
mock.module('@/services/request', () => ({
  getToken: () => '',
  setToken: () => {},
  RequestError: class RequestError extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.status = status;
    }
  },
  default: {},
}));
