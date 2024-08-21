interface APIConfig {
  loginUrl: string;
  meUrl: string;
  listUrl: string;
  activeUrl: string;
  sendmailUrl: string;
  registerUrl: string;
  ordersUrl: string;
  createUrl: string;
  appsUrl: string;
  resetMailUrl: string;
  resetPwdUrl: string;
}

export const API: APIConfig = {
  loginUrl: 'user/login',
  meUrl: 'user/me',
  listUrl: 'app/list',
  activeUrl: 'user/active',
  sendmailUrl: 'user/active/sendmail',
  registerUrl: 'user/register',
  ordersUrl: 'orders',
  createUrl: 'app/create',
  appsUrl: '/apps',
  resetMailUrl: 'user/resetpwd/sendmail',
  resetPwdUrl: 'user/resetpwd/reset',
};
