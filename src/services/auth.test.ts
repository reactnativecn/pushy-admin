import { beforeEach, describe, expect, mock, test } from 'bun:test';

const mockMessageSuccess = mock();
const mockMessageError = mock();
mock.module('antd', () => ({
  message: {
    success: mockMessageSuccess,
    error: mockMessageError,
  },
}));

mock.module('hash-wasm', () => ({
  md5: mock(async (str: string) => `${str}_hashed`),
}));

const mockNavigate = mock();
let mockSearch = '';
let mockPathname = '/';
const mockRootRouterPath = {
  login: '/login',
  apps: '/apps',
  inactivated: '/inactivated',
};

mock.module('@/router', () => ({
  rootRouterPath: mockRootRouterPath,
  router: {
    get state() {
      return {
        location: { search: mockSearch, pathname: mockPathname },
      };
    },
    navigate: mockNavigate,
  },
}));

class MockRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const mockApiLogin = mock();
mock.module('@/services/api', () => ({
  api: {
    login: mockApiLogin,
  },
}));

const mockSetToken = mock();
mock.module('@/services/request', () => ({
  RequestError: MockRequestError,
  setToken: mockSetToken,
}));

const mockReload = mock();
Object.defineProperty(window.location, 'reload', {
  value: mockReload,
  configurable: true,
  writable: true,
});

import { getUserEmail, login, logout, setUserEmail } from './auth';

describe('auth service', () => {
  beforeEach(() => {
    mockMessageSuccess.mockClear();
    mockMessageError.mockClear();
    mockNavigate.mockClear();
    mockApiLogin.mockClear();
    mockSetToken.mockClear();
    mockReload.mockClear();
    mockSearch = '';
    mockPathname = '/';
  });

  describe('login', () => {
    test('successful login sets token, email, shows message, and navigates', async () => {
      mockApiLogin.mockResolvedValue({ token: 'valid-token' });
      mockSearch = '?loginFrom=/custom-path';

      await login('test@example.com', 'mypassword');

      expect(getUserEmail()).toBe('test@example.com');
      expect(mockApiLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        pwd: 'mypassword_hashed',
      });
      expect(mockSetToken).toHaveBeenCalledWith('valid-token');
      expect(mockMessageSuccess).toHaveBeenCalledWith('登录成功');
      expect(mockNavigate).toHaveBeenCalledWith('/custom-path');
    });

    test('resolveLoginFrom fallback when loginFrom is empty or invalid', async () => {
      mockApiLogin.mockResolvedValue({ token: 'valid-token' });

      // Empty
      mockSearch = '';
      await login('test1@example.com', 'pwd');
      expect(mockNavigate).toHaveBeenCalledWith('/apps');

      // Not starting with /
      mockSearch = '?loginFrom=https://evil.com';
      await login('test2@example.com', 'pwd');
      expect(mockNavigate).toHaveBeenCalledWith('/apps');

      // Starts with //
      mockSearch = '?loginFrom=//evil.com';
      await login('test3@example.com', 'pwd');
      expect(mockNavigate).toHaveBeenCalledWith('/apps');

      // Is /login
      mockSearch = '?loginFrom=/login';
      await login('test4@example.com', 'pwd');
      expect(mockNavigate).toHaveBeenCalledWith('/apps');

      // Starts with /login?
      mockSearch = '?loginFrom=/login?redirect=/apps';
      await login('test5@example.com', 'pwd');
      expect(mockNavigate).toHaveBeenCalledWith('/apps');
    });

    test('handles 423 RequestError by navigating to inactivated page', async () => {
      mockApiLogin.mockRejectedValue(new MockRequestError('Inactivated', 423));

      await login('inactive@example.com', 'pwd');

      expect(mockNavigate).toHaveBeenCalledWith('/inactivated');
      expect(mockMessageError).not.toHaveBeenCalled();
    });

    test('handles other errors by showing error message', async () => {
      mockApiLogin.mockRejectedValue(new Error('Invalid credentials'));

      await login('wrong@example.com', 'pwd');

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockMessageError).toHaveBeenCalledWith('Invalid credentials');
    });

    test('handles unknown errors by showing fallback message', async () => {
      mockApiLogin.mockRejectedValue('Some string error');

      await login('unknown@example.com', 'pwd');

      expect(mockMessageError).toHaveBeenCalledWith('登录失败');
    });
  });

  describe('logout', () => {
    test('clears token, navigates to login if not already there, and reloads', () => {
      mockPathname = '/apps';
      logout();

      expect(mockSetToken).toHaveBeenCalledWith('');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
      expect(mockReload).toHaveBeenCalled();
    });

    test('clears token and reloads, but does not navigate if already on login page', () => {
      mockPathname = '/login';
      logout();

      expect(mockSetToken).toHaveBeenCalledWith('');
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('setUserEmail', () => {
    test('updates the email', () => {
      setUserEmail('new@example.com');
      expect(getUserEmail()).toBe('new@example.com');
    });
  });
});
