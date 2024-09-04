import { LoadingOutlined } from '@ant-design/icons';
import { Button, Result } from 'antd';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import request, { RequestError } from '../request';

const state = observable.object({ loading: true, error: '' });

export const Component = observer(() => {
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('code');
  useEffect(() => {
    request('post', 'user/active', { token })
      .then(() => runInAction(() => (state.loading = false)))
      .catch(({ message }: RequestError) =>
        runInAction(() => (state.error = message ?? '激活失败'))
      );
  }, []);
  if (state.error) {
    return <Result status='error' title={state.error} />;
  }
  if (state.loading) {
    return <Result icon={<LoadingOutlined />} title='激活中，请稍等' />;
  }
  return (
    <Result
      status='success'
      title='激活成功'
      extra={
        <Link to='/login' replace>
          <Button type='primary' loading={state.loading}>
            请登录
          </Button>
        </Link>
      }
    />
  );
});
