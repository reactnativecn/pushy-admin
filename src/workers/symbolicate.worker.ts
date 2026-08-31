import { symbolicateStack } from '@/utils/symbolicate-stack';

interface WorkerRequest {
  id: number;
  stack: string;
  sourceMap: string;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, stack, sourceMap } = event.data;
  try {
    self.postMessage({ id, result: symbolicateStack(stack, sourceMap) });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
