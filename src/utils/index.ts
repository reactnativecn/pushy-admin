import { API } from './api';
import { queryClient } from './queryClient';
import request, { RequestError } from './request';

export function isPasswordValid(password: string) {
  return /(?!^[0-9]+$)(?!^[a-z]+$)(?!^[^A-Z]+$)^.{6,16}$/.test(password);
}

export { API, queryClient, request, RequestError };
