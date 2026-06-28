import { Button, Result } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useRouteError } from 'react-router-dom';

interface ChunkError extends Error {
  __webpack_chunkName?: string;
}

const CHUNK_ERROR_RELOAD_KEY = 'pushy_chunk_error_reload_attempted';

const isLocalHost = () => {
  const { hostname } = window.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1'
  );
};

export function ErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError() as ChunkError;
  const navigate = useNavigate();

  const message = error?.message || '';

  const isChunkError =
    message &&
    (message.includes('Loading CSS chunk') ||
      message.includes('Loading chunk') ||
      message.includes('ChunkLoadError'));

  useEffect(() => {
    if (!isChunkError) {
      window.sessionStorage.removeItem(CHUNK_ERROR_RELOAD_KEY);
      return;
    }

    if (
      process.env.NODE_ENV === 'production' &&
      !isLocalHost() &&
      !window.sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY)
    ) {
      window.sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, '1');
      window.location.reload();
    }
  }, [isChunkError]);

  const handleRetry = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Result
      status="500"
      title={t('error_boundary.title')}
      subTitle={message || t('error_boundary.unknown_error')}
      extra={
        <>
          <Button type="primary" onClick={handleRetry}>
            {t('error_boundary.retry')}
          </Button>
          <Button onClick={handleGoHome}>{t('error_boundary.back_home')}</Button>
        </>
      }
    />
  );
}
