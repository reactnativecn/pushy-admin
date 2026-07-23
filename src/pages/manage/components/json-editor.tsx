import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSONEditorPropsOptional } from 'vanilla-jsoneditor';

export default function JsonEditor({
  className,
  ...props
}: JSONEditorPropsOptional & { className?: string }) {
  const refContainer = useRef<HTMLDivElement>(null);
  const refEditor = useRef<any>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadCount, setLoadCount] = useState(0);

  const handleRetry = useCallback(() => {
    setLoadError(false);
    setLoading(true);
    setLoadCount((c) => c + 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload dynamic import on loadCount change
  useEffect(() => {
    let destroyed = false;

    // 动态按需加载 vanilla-jsoneditor 库，避免同步编译入主包
    import('vanilla-jsoneditor')
      .then(({ createJSONEditor, Mode }) => {
        if (destroyed || !refContainer.current) return;

        refEditor.current = createJSONEditor({
          target: refContainer.current,
          props: {
            mode: Mode.text,
            ...propsRef.current,
          },
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load vanilla-jsoneditor:', err);
        if (!destroyed) {
          setLoadError(true);
          setLoading(false);
        }
      });

    return () => {
      destroyed = true;
      if (refEditor.current) {
        refEditor.current.destroy();
        refEditor.current = null;
      }
    };
  }, [loadCount]);

  useEffect(() => {
    if (refEditor.current) {
      refEditor.current.updateProps(props);
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: update props when object props change
  }, [props]);

  return (
    <div className={className} style={{ position: 'relative', minHeight: 120 }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'var(--ant-color-bg-container, #ffffff)',
          }}
        >
          <Spin tip="加载编辑器..." />
        </div>
      )}
      {loadError && (
        <div style={{ padding: 16 }}>
          <Alert
            type="error"
            showIcon
            message="JSON 编辑器组件加载失败"
            description={
              <Button
                size="small"
                type="primary"
                danger
                icon={<ReloadOutlined />}
                onClick={handleRetry}
                style={{ marginTop: 8 }}
              >
                重新加载编辑器
              </Button>
            }
          />
        </div>
      )}
      <div ref={refContainer} />
    </div>
  );
}
