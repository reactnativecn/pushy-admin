import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

const mockLogout = mock(() => {});
const mockMessageError = mock(() => {});

mock.module('antd', () => ({
  message: { error: mockMessageError },
}));

mock.module('./auth', () => ({
  logout: mockLogout,
}));

import { handleResponse, RequestError } from './response';

function makeResponse(init: {
  status: number;
  body?: unknown;
  contentType?: string | null;
}): Response {
  const { status, body, contentType = 'application/json' } = init;
  const headers = new Headers();
  if (contentType) {
    headers.set('content-type', contentType);
  }
  return {
    status,
    ok: status >= 200 && status < 300,
    headers,
    json: async () => {
      if (body === undefined) {
        throw new SyntaxError('Unexpected end of JSON input');
      }
      return body;
    },
  } as unknown as Response;
}

describe('handleResponse', () => {
  beforeEach(() => {
    mockLogout.mockClear();
    mockMessageError.mockClear();
  });

  afterEach(() => {
    mock.restore();
  });

  it('returns parsed JSON on a 200 response', async () => {
    const res = await handleResponse<{ data: number[] }>(
      makeResponse({ status: 200, body: { data: [1, 2, 3] } }),
    );
    expect(res).toEqual({ data: [1, 2, 3] } as never);
  });

  it('treats any 2xx (e.g. 201) as success', async () => {
    const res = await handleResponse<{ id: number }>(
      makeResponse({ status: 201, body: { id: 7 } }),
    );
    expect(res).toEqual({ id: 7 } as never);
  });

  it('does not throw on a 204 empty (non-JSON) body', async () => {
    const res = await handleResponse(
      makeResponse({ status: 204, body: undefined, contentType: null }),
    );
    expect(res).toEqual({} as never);
  });

  it('throws RequestError and calls logout on 401 instead of resolving undefined', async () => {
    let caught: unknown;
    try {
      await handleResponse(
        makeResponse({ status: 401, body: { message: 'nope' } }),
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RequestError);
    expect((caught as RequestError).status).toBe(401);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('throws RequestError with server message on a 4xx business error', async () => {
    let caught: unknown;
    try {
      await handleResponse(
        makeResponse({ status: 400, body: { message: 'bad params' } }),
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RequestError);
    expect((caught as RequestError).message).toBe('bad params');
    expect(mockMessageError).toHaveBeenCalledWith('bad params');
  });

  it('does not toast the error when suppressErrorToast is set', async () => {
    let caught: unknown;
    try {
      await handleResponse(
        makeResponse({ status: 400, body: { message: 'silent' } }),
        {
          suppressErrorToast: true,
        },
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RequestError);
    expect(mockMessageError).not.toHaveBeenCalled();
  });

  it('surfaces the status when the server returns a non-JSON error page', async () => {
    let caught: unknown;
    try {
      await handleResponse(
        makeResponse({
          status: 502,
          body: undefined,
          contentType: 'text/html',
        }),
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RequestError);
    expect((caught as RequestError).status).toBe(502);
    expect((caught as RequestError).message).toContain('502');
  });
});
