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
global.getComputedStyle = win.getComputedStyle.bind(win) as any;
global.Element = win.Element as any;
global.HTMLElement = win.HTMLElement as any;
global.SVGElement = win.SVGElement as any;
global.Node = win.Node as any;
global.HTMLInputElement = win.HTMLInputElement as any;
global.StorageEvent = win.StorageEvent as any;

// Mock dependencies that cause side effects or fail on static assets imports
mock.module('@/services/api', () => ({
  api: {},
}));
// request 会在加载时探测线路，测试里换成空实现；会话与错误类型直接用真实模块
mock.module('@/services/request', () => ({
  default: {},
  resolveApiBaseUrl: async () => '',
}));
mock.module('@/assets/logo-h.svg', () => ({
  default: 'logo',
  ReactComponent: () => null,
}));
mock.module('@/assets/logo.png', () => ({
  default: 'logo.png',
}));
mock.module('react-router-dom', () => ({
  createHashRouter: () => ({
    state: { location: { search: '', pathname: '' } },
    navigate: () => {},
  }),
  redirect: () => {},
  useNavigate: () => {},
  useRouteError: () => {},
  isRouteErrorResponse: () => false,
  Link: () => null,
  NavLink: () => null,
  Navigate: () => null,
  Outlet: () => null,
  useLocation: () => ({
    pathname: '',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  }),
  useSearchParams: () => [new URLSearchParams(), () => {}],
  useLoaderData: () => null,
  useActionData: () => null,
}));

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as any;
}
