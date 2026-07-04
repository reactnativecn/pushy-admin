import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

// In order to avoid environment setup issues with react-router-dom and other DOM dependencies during test execution
// in bun, we can mock out the internal dependencies and the router directly.

const mockNavigate = mock(() => {});
const mockRouterObj = {
  state: {
    location: {
      search: '',
      pathname: '/current-path',
    },
  },
  navigate: mockNavigate,
};

mock.module('@/router', () => ({
  rootRouterPath: {
    apps: '/apps',
    home: '/',
    inactivated: '/inactivated',
    login: '/login',
  },
  router: mockRouterObj,
}));

const mockMessage = {
  success: mock(() => {}),
  error: mock(() => {}),
};

mock.module('antd', () => ({
  message: mockMessage,
}));

const mockApiObj = {
  login: mock(async () => ({ token: 'fake-token' })),
};

mock.module('@/services/api', () => ({
  api: mockApiObj,
}));

mock.module('hash-wasm', () => ({
  md5: mock(async (str) => `md5-${str}`),
}));

// i18n.t echoes the key so assertions can match on stable keys instead of
// locale strings.
mock.module('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

class MockRequestError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

const mockSetTokenObj = mock(() => {});

mock.module('@/services/request', () => ({
  RequestError: MockRequestError,
  setToken: mockSetTokenObj,
}));

// Provide react-router-dom mock globally to stop "Cannot parse URL /" on router load when using happy-dom
mock.module('react-router-dom', () => ({
  createHashRouter: () => ({
    state: { location: { search: '', pathname: '' } },
    navigate: () => {},
  }),
  redirect: () => {},
  useNavigate: () => {}, // mock useNavigate because it failed on export earlier
  Navigate: () => null,
}));

// Mock main-layout because it imports logo which causes the SVG error
mock.module('@/components/main-layout', () => ({
  default: () => null,
}));

// Now import the functions to test
import { getUserEmail, login, logout, setUserEmail } from './auth';

describe('auth.ts runtime test', () => {
  let originalLocation: Location;

  beforeEach(() => {
    mockMessage.success.mockClear();
    mockMessage.error.mockClear();
    mockNavigate.mockClear();
    mockSetTokenObj.mockClear();
    mockApiObj.login.mockClear();
    setUserEmail('');

    mockRouterObj.state.location.search = '';
    mockRouterObj.state.location.pathname = '/current-path';

    // We mock window.location.reload because logout calls it.
    originalLocation = global.window
      ? global.window.location
      : ({} as Location);
    if (!global.window) {
      global.window = {} as any;
    }

    Object.defineProperty(global.window, 'location', {
      value: { ...originalLocation, reload: mock(() => {}) },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global.window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('should get and set user email', () => {
    setUserEmail('test@email.com');
    expect(getUserEmail()).toBe('test@email.com');
  });

  describe('login', () => {
    it('should successfully login and navigate to apps if no loginFrom is present', async () => {
      await login('test@email.com', 'mypassword');

      expect(getUserEmail()).toBe('test@email.com');
      expect(mockApiObj.login).toHaveBeenCalledWith({
        email: 'test@email.com',
        pwd: 'md5-mypassword',
      });
      expect(mockSetTokenObj).toHaveBeenCalledWith('fake-token');
      expect(mockMessage.success).toHaveBeenCalledWith('login.success');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should navigate to loginFrom if it is a valid path', async () => {
      mockRouterObj.state.location.search = '?loginFrom=/user/settings';
      await login('test@email.com', 'mypassword');

      expect(mockNavigate).toHaveBeenCalledWith('/user/settings');
    });

    it('should navigate to default / if loginFrom is external //', async () => {
      mockRouterObj.state.location.search = '?loginFrom=//evil.com';
      await login('test@email.com', 'mypassword');

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should navigate to inactivated page if 423 RequestError occurs', async () => {
      mockApiObj.login.mockImplementationOnce(async () => {
        throw new MockRequestError('Account inactive', 423);
      });

      await login('test@email.com', 'mypassword');

      expect(mockNavigate).toHaveBeenCalledWith('/inactivated');
      expect(mockMessage.error).not.toHaveBeenCalled();
    });

    it('should display error message on other errors', async () => {
      mockApiObj.login.mockImplementationOnce(async () => {
        throw new Error('Server error');
      });

      await login('test@email.com', 'mypassword');

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockMessage.error).toHaveBeenCalledWith('Server error');
    });
  });

  describe('logout', () => {
    it('should set token to empty string, navigate to login, and reload', () => {
      mockRouterObj.state.location.pathname = '/apps';

      logout();

      expect(mockSetTokenObj).toHaveBeenCalledWith('');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
      expect(global.window.location.reload).toHaveBeenCalled();
    });

    it('should skip navigate to login if already on login page', () => {
      mockRouterObj.state.location.pathname = '/login';

      logout();

      expect(mockSetTokenObj).toHaveBeenCalledWith('');
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(global.window.location.reload).toHaveBeenCalled();
    });
  });
});
