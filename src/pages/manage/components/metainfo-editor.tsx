import { JSONEditor, JSONEditorPropsOptional, Mode } from 'vanilla-jsoneditor';
import { useEffect, useRef } from 'react';

export default function MetaInfoEditor({
  className,
  ...props
}: JSONEditorPropsOptional & { className?: string }) {
  const refContainer = useRef<HTMLDivElement>(null);
  const refEditor = useRef<JSONEditor | null>(null);

  useEffect(() => {
    // create editor
    refEditor.current = new JSONEditor({
      target: refContainer.current as Element,
      props: {
        ...props,
        mode: Mode.text,
      },
    });

    return () => {
      if (refEditor.current) {
        refEditor.current.destroy();
        refEditor.current = null;
      }
    };
  }, [props]);

  useEffect(() => {
    refEditor.current?.updateProps(props);
  }, [props]);

  return <div className={className} ref={refContainer} />;
}
