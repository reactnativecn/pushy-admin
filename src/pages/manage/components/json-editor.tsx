import { Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { JSONEditorPropsOptional } from 'vanilla-jsoneditor';

export default function JsonEditor({
  className,
  ...props
}: JSONEditorPropsOptional & { className?: string }) {
  const refContainer = useRef<HTMLDivElement>(null);
  const refEditor = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial setup
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
            ...props,
          },
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load vanilla-jsoneditor:', err);
        setLoading(false);
      });

    return () => {
      destroyed = true;
      if (refEditor.current) {
        refEditor.current.destroy();
        refEditor.current = null;
      }
    };
  }, []);

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
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Spin tip="加载编辑器..." />
        </div>
      )}
      <div ref={refContainer} />
    </div>
  );
}
