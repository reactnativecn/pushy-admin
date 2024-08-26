import { useEffect, useState } from 'react';
import { Button, message, Result } from 'antd';
// import { observable } from 'mobx';
// import { observer } from 'mobx-react-lite';
// import store from '../store';
import { API, request } from '../utils';
import useUserInfo from '../hooks/useUserInfo';
import { history } from '../index';

// const state = observable.object({ loading: false });

export default function SendEmail() {
  const [loading, setLoading] = useState<boolean>(false);
  const { userInfo } = useUserInfo();
  useEffect(() => {
    if (!userInfo?.email) {
      history.replace('/login');
    }
  }, []);

  async function sendEmail() {
    const { email } = userInfo!;
    // state.loading = true;
    setLoading(true);
    try {
      await request('post', API.sendmailUrl, { email });
      message.info('邮件发送成功，请注意查收');
    } catch (_) {
      message.error('邮件发送失败');
    }
    setLoading(false);
    // state.loading = false;
  }

  return (
    <Result
      title='您的账号还未激活，请查看您的邮箱'
      subTitle='如未收到激活邮件，请点击'
      extra={[
        <Button key='resend' type='primary' onClick={() => sendEmail} loading={loading}>
          再次发送
        </Button>,
        <Button key='back' href='/user'>
          返回登录
        </Button>,
      ]}
    />
  );
}
