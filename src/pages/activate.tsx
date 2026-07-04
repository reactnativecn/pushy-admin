import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { api } from '@/services/api';

export const Activate = () => {
  const { t } = useTranslation();
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
    return (
      <Result icon={<LoadingOutlined />} title={t('activate.activating')} />
    );
  }
  return (
    <Result
      status="success"
      title={t('activate.success')}
      extra={
        <Link to={rootRouterPath.login} replace>
          <Button type="primary">{t('activate.go_login')}</Button>
        </Link>
      }
    />
  );
};

export const Component = Activate;
