import { useEffect, useRef } from "react";
import {
  type JSONEditorPropsOptional,
  Mode,
  createJSONEditor,
} from "vanilla-jsoneditor";

export default function MetaInfoEditor({
  className,
  ...props
}: JSONEditorPropsOptional & { className?: string }) {
  const refContainer = useRef<HTMLDivElement>(null);
  const refEditor = useRef<ReturnType<typeof createJSONEditor>>();

  useEffect(() => {
    // create editor
    refEditor.current = createJSONEditor({
      target: refContainer.current!,
      props: {
        ...props,
        mode: Mode.text,
      },
    });

    return () => {
      if (refEditor.current) {
        refEditor.current.destroy();
        refEditor.current = undefined;
      }
    };
  }, [props]);

  useEffect(() => {
    refEditor.current?.updateProps(props);
  }, [props]);

  return <div className={className} ref={refContainer} />;
}
