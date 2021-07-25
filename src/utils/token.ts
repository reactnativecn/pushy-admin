const name = 'pushy_token';

let token = localStorage.getItem(name);

export function setToken(_token: string) {
  token = _token;
  localStorage.setItem(name, _token);
}

export function removeToken() {
  token = null;
  localStorage.removeItem(name);
}

export function getToken() {
  return token;
}

export function getAuthHeader() {
  return token ? { 'x-accesstoken': token } : undefined;
}
