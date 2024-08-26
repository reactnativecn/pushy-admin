import { useEffect, useState } from 'react';
import { Button, message, Result } from 'antd';
// import { observable } from 'mobx';
// import { observer } from 'mobx-react-lite';
import store from '../store';
import { API, request } from '../utils';
import { history } from '../index';
import useUserInfo from '../hooks/useUserInfo';

// const state = observable.object({ loading: false });

export default function Welcome() {
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
    // state.loading = false;
    setLoading(false);
  }

  return (
    <Result
      title={
        <>
          感谢您关注由 React Native 中文网提供的热更新服务
          <br />
          我们已经往您的邮箱发送了一封激活邮件
          <br />
          请点击邮件内的激活链接激活您的帐号
          <div style={{ height: 24 }} />
        </>
      }
      subTitle='如未收到激活邮件，请点击'
      extra={
        <Button type='primary' onClick={() => sendEmail} loading={loading}>
          重新发送
        </Button>
      }
    />
  );
}
