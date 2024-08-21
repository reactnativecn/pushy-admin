import { Button, message, Result } from 'antd';
import { observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import request from '../request';
import store from '../store';
import { API } from '../api';

const state = observable.object({ loading: false });

export default observer(() => {
  useEffect(() => {
    if (!store.email) {
      store.history.replace('/login');
    }
  }, []);
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
        <Button type='primary' onClick={sendEmail} loading={state.loading}>
          重新发送
        </Button>
      }
    />
  );
});

async function sendEmail() {
  const { email } = store;
  state.loading = true;
  try {
    await request('post', API.sendmailUrl, { email });
    message.info('邮件发送成功，请注意查收');
  } catch (_) {
    message.error('邮件发送失败');
  }
  state.loading = false;
}
