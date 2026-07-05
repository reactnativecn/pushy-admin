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
class MockRequestError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

const mockSetToken = mock(() => {});
const mockMarkCookieSession = mock(() => {});
const mockClearSession = mock(() => {});

mock.module('@/services/request', () => ({
  getToken: () => '',
  hasSession: () => false,
  usesCookieSession: () => false,
  setToken: mockSetToken,
  markCookieSession: mockMarkCookieSession,
  clearSession: mockClearSession,
  RequestError: MockRequestError,
  default: {},
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
