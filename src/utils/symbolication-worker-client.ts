import type { SymbolicationResult } from './symbolicate-stack';

interface WorkerResponse {
  id: number;
  result?: SymbolicationResult;
  error?: string;
}

let requestID = 0;

export function symbolicateInWorker(
  stack: string,
  sourceMap: string,
): Promise<SymbolicationResult> {
  const worker = new Worker(
    new URL('../workers/symbolicate.worker.ts', import.meta.url),
    { type: 'module' },
  );
  const id = ++requestID;
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error('symbolication timed out'));
    }, 15_000);
    const finish = () => {
      window.clearTimeout(timeout);
      worker.terminate();
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || 'symbolication worker failed'));
    };
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return;
      finish();
      if (event.data.result) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error || 'symbolication failed'));
      }
    };
    worker.postMessage({ id, stack, sourceMap });
  });
}
