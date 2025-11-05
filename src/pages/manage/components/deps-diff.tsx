import { Differ, Viewer } from 'json-diff-kit';
import 'json-diff-kit/dist/viewer.css';

const differ = new Differ({
  detectCircular: true, // default `true`
  maxDepth: Number.POSITIVE_INFINITY, // default `Infinity`
  showModifications: true, // default `true`
  arrayDiffMethod: 'lcs', // default `"normal"`, but `"lcs"` may be more useful
});

export const DepsDiff = ({
  oldDeps,
  newDeps,
}: {
  oldDeps?: Record<string, string>;
  newDeps?: Record<string, string>;
}) => {
  if (!oldDeps || !newDeps) {
    return null;
  }
  const diff = differ.diff(oldDeps, newDeps);
  return (
    <Viewer
      diff={diff} // required
      // indent={4}                 // default `2`
      // lineNumbers={true}         // default `false`
      highlightInlineDiff={true} // default `false`
      // inlineDiffOptions={{
      //   mode: "word", // default `"char"`, but `"word"` may be more useful
      //   wordSeparator: ".", // default `""`, but `" "` is more useful for sentences
      // }}
    />
  );
};
