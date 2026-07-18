import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { api } from '@/services/api';
import { clearSession, setToken } from '@/services/request';
import { clearWorkspace } from '@/services/workspace';
import { queryClient } from '@/utils/queryClient';

function resetPreviousAccountQueries() {
  return queryClient.resetQueries({
    predicate: (query) => query.queryKey[0] !== 'emailChange',
  });
}

function EmailChangeResult() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const token = new URLSearchParams(search).get('code') ?? '';
  const isRevert = pathname === rootRouterPath.revertEmail;
  const mode = isRevert ? 'revert' : 'confirm';
  const { isLoading, error } = useQuery({
    queryKey: ['emailChange', mode, token],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      if (isRevert) {
        const result = await api.revertEmailChange({ token });
        clearSession();
        clearWorkspace();
        await resetPreviousAccountQueries();
        return result;
      }

      const result = await api.confirmEmailChange({ token });
      clearWorkspace();
      setToken(result.token);
      await resetPreviousAccountQueries();
      return result;
    },
  });

  if (!token) {
    return (
      <Result status="error" title={t('user.email_change_link_invalid')} />
    );
  }
  if (error) {
    return <Result status="error" title={error.message} />;
  }
  if (isLoading) {
    return (
      <Result
        icon={<LoadingOutlined />}
        title={t(isRevert ? 'user.email_reverting' : 'user.email_confirming')}
      />
    );
  }

  const target = isRevert ? rootRouterPath.login : rootRouterPath.user;
  return (
    <Result
      status="success"
      title={t(isRevert ? 'user.email_reverted' : 'user.email_changed')}
      subTitle={t(
        isRevert ? 'user.email_reverted_hint' : 'user.email_changed_hint',
      )}
      extra={
        <Link to={target} replace>
          <Button type="primary">
            {t(isRevert ? 'user.go_login' : 'user.go_account')}
          </Button>
        </Link>
      }
    />
  );
}

export const Component = EmailChangeResult;
