import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { Button, Result } from 'antd';
import { api } from '@/services/api';

function ActivateComponent() {
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('code') || '';
  const { isLoading, error } = useQuery({
    queryKey: ['activate', token],
    queryFn: () => api.activate({ token }),
    enabled: !!token,
  });
  if (error) {
    return <Result status="error" title={error.message} />;
  }
  if (isLoading) {
    return <Result icon={<LoadingOutlined />} title="激活中，请稍等" />;
  }
  return (
    <Result
      status="success"
      title="激活成功"
      extra={
        <Link to="/login" replace>
          <Button type="primary">请登录</Button>
        </Link>
      }
    />
  );
}

export const Route = createFileRoute('/activate')({
  component: ActivateComponent,
});
