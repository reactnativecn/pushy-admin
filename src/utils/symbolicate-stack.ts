import {
  originalPositionFor,
  sourceContentFor,
  TraceMap,
} from '@jridgewell/trace-mapping';

export interface SourceSnippetLine {
  number: number;
  text: string;
}

export interface SourceSnippet {
  source: string;
  line: number;
  column: number;
  lines: SourceSnippetLine[];
}

export interface SymbolicationResult {
  stack: string;
  mappedFrames: number;
  totalFrames: number;
  firstSnippet?: SourceSnippet;
}

interface ParsedFrame {
  functionName?: string;
  generatedLine: number;
  generatedColumn: number;
  hermesAddress: boolean;
}

const STACK_LOCATION = /(?:(address at)\s+)?(.+):(\d+):(\d+)\)?$/;

function parseFrame(line: string): ParsedFrame | undefined {
  const match = STACK_LOCATION.exec(line);
  if (!match) return undefined;
  const generatedLine = Number(match[3]);
  const rawColumn = Number(match[4]);
  if (
    !Number.isSafeInteger(generatedLine) ||
    !Number.isSafeInteger(rawColumn)
  ) {
    return undefined;
  }
  const prefix = line.slice(0, match.index);
  const functionMatch = /^\s*at\s+(.+?)\s+\($/.exec(prefix);
  return {
    functionName: functionMatch?.[1],
    generatedLine,
    // React Native JS stack columns are 1-based. Hermes `address at` values
    // are bytecode offsets and must be passed through unchanged.
    generatedColumn: match[1] ? rawColumn : Math.max(0, rawColumn - 1),
    hermesAddress: Boolean(match[1]),
  };
}

function buildSnippet(
  map: TraceMap,
  source: string,
  line: number,
  column: number,
): SourceSnippet | undefined {
  const content = sourceContentFor(map, source);
  if (typeof content !== 'string') return undefined;
  const sourceLines = content.split(/\r?\n/);
  const start = Math.max(1, line - 2);
  const end = Math.min(sourceLines.length, line + 2);
  const lines: SourceSnippetLine[] = [];
  for (let lineNumber = start; lineNumber <= end; lineNumber += 1) {
    lines.push({ number: lineNumber, text: sourceLines[lineNumber - 1] ?? '' });
  }
  return { source, line, column, lines };
}

export function symbolicateStack(
  rawStack: string,
  sourceMap: string | object,
): SymbolicationResult {
  const map = new TraceMap(
    sourceMap as ConstructorParameters<typeof TraceMap>[0],
  );
  let mappedFrames = 0;
  let totalFrames = 0;
  let firstSnippet: SourceSnippet | undefined;
  const stack = rawStack
    .split('\n')
    .map((line) => {
      const frame = parseFrame(line);
      if (!frame) return line;
      totalFrames += 1;
      const original = originalPositionFor(map, {
        line: frame.generatedLine,
        column: frame.generatedColumn,
      });
      if (
        original.source === null ||
        original.line === null ||
        original.column === null
      ) {
        return line;
      }
      mappedFrames += 1;
      const functionName = original.name || frame.functionName || '<anonymous>';
      const displayColumn = original.column + 1;
      firstSnippet ??= buildSnippet(
        map,
        original.source,
        original.line,
        displayColumn,
      );
      return `    at ${functionName} (${original.source}:${original.line}:${displayColumn})`;
    })
    .join('\n');
  return {
    stack,
    mappedFrames,
    totalFrames,
    ...(firstSnippet ? { firstSnippet } : {}),
  };
}
