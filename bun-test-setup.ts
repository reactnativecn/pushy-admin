import { mock } from 'bun:test';
import { GlobalWindow } from 'happy-dom';

const win = new GlobalWindow();
global.window = win as any;
global.document = win.document as any;
global.navigator = win.navigator as any;
global.localStorage = win.localStorage as any;
global.addEventListener = win.addEventListener.bind(win) as any;
global.removeEventListener = win.removeEventListener.bind(win) as any;
global.dispatchEvent = win.dispatchEvent.bind(win) as any;
global.StorageEvent = win.StorageEvent as any;

// Mock dependencies that cause side effects or fail on static assets imports
mock.module('@/services/api', () => ({
  api: {},
}));
mock.module('@/services/request', () => ({
  getToken: () => '',
  default: {},
}));
