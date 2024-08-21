import { Button, Form, Input, message, Result } from 'antd';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import request, { RequestError } from '../../request';
import { API } from '../../api';

const state = observable.object({ loading: false, sent: false });

export default observer(() => {
  if (state.sent) {
    return (
      <Result
        status='success'
        title='验证邮件已发送至您的邮箱，请点击邮件中的链接完成操作'
        subTitle='验证邮件 24 小时有效，请尽快验证！'
      />
    );
  }
  return (
    <Form
      style={{ width: 320, margin: 'auto' }}
      onFinish={async (values) => {
        runInAction(() => (state.loading = true));
        try {
          await request('post', API.resetMailUrl, values);
          runInAction(() => (state.sent = true));
        } catch (e) {
          message.error((e as RequestError).message ?? '网络错误');
        }
        runInAction(() => (state.loading = false));
      }}
    >
      <Form.Item name='email'>
        <Input placeholder='输入绑定邮箱' type='email' required />
      </Form.Item>
      <Form.Item>
        <Button type='primary' htmlType='submit' loading={state.loading} block>
          发送邮件
        </Button>
      </Form.Item>
    </Form>
  );
});
