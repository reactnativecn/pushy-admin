import { describe, expect, it } from 'bun:test';
import { buildRequest } from './build-request';

const BASE_URL = 'https://api.test';

describe('buildRequest', () => {
  it('builds GET urls with query params and sends the auth token header', () => {
    const { url, options } = buildRequest({
      method: 'get',
      path: '/user/me',
      baseUrl: BASE_URL,
      params: { a: '1', b: '2' },
      token: 'token-1',
    });

    expect(url).toBe(`${BASE_URL}/user/me?a=1&b=2`);
    expect(options.method).toBe('get');
    expect((options.headers as Record<string, string>)['x-accesstoken']).toBe(
      'token-1',
    );
    expect(options.body).toBeUndefined();
  });

  it('serializes non-GET params as a JSON body with content-type', () => {
    const { url, options } = buildRequest({
      method: 'post',
      path: '/app/create',
      baseUrl: BASE_URL,
      params: { name: 'demo' },
    });

    expect(url).toBe(`${BASE_URL}/app/create`);
    expect((options.headers as Record<string, string>)['content-type']).toBe(
      'application/json',
    );
    expect(options.body).toBe(JSON.stringify({ name: 'demo' }));
  });

  it('omits the token header when no token is present', () => {
    const { options } = buildRequest({
      method: 'get',
      path: '/user/me',
      baseUrl: BASE_URL,
      token: null,
    });

    expect(
      (options.headers as Record<string, string>)['x-accesstoken'],
    ).toBeUndefined();
  });

  it('strips a trailing slash from the base url', () => {
    const { url } = buildRequest({
      method: 'delete',
      path: '/app/1',
      baseUrl: `${BASE_URL}/`,
    });

    expect(url).toBe(`${BASE_URL}/app/1`);
  });

  it('includes credentials only when withCredentials is set', () => {
    const withCookies = buildRequest({
      method: 'get',
      path: '/user/me',
      baseUrl: BASE_URL,
      withCredentials: true,
    });
    expect(withCookies.options.credentials).toBe('include');

    const withoutCookies = buildRequest({
      method: 'get',
      path: '/user/me',
      baseUrl: BASE_URL,
    });
    expect(withoutCookies.options.credentials).toBeUndefined();
  });

  it('does not append a query string when GET has no params', () => {
    const { url, options } = buildRequest({
      method: 'get',
      path: '/app/list',
      baseUrl: BASE_URL,
    });

    expect(url).toBe(`${BASE_URL}/app/list`);
    expect(options.body).toBeUndefined();
  });
});
