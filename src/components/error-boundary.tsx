import { Button, Result } from "antd";
import { useEffect } from "react";
import { useNavigate, useRouteError } from "react-router-dom";

interface ChunkError extends Error {
  __webpack_chunkName?: string;
}

export function ErrorBoundary() {
  const error = useRouteError() as ChunkError;
  const navigate = useNavigate();

  const isChunkError =
    error?.message?.includes("Loading CSS chunk") ||
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("ChunkLoadError");

  useEffect(() => {
    if (isChunkError) {
      window.location.reload();
    }
  }, [isChunkError]);

  const handleRetry = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <Result
      status="500"
      title="页面出错了"
      subTitle={error?.message || "发生了未知错误"}
      extra={
        <>
          <Button type="primary" onClick={handleRetry}>
            重试
          </Button>
          <Button onClick={handleGoHome}>返回首页</Button>
        </>
      }
    />
  );
}
