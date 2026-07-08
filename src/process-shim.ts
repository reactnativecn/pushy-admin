type BrowserProcess = {
  env?: Record<string, string | undefined>;
  versions?: Record<string, string | undefined>;
  emit?: (...args: unknown[]) => unknown;
};

const globalScope = globalThis as unknown as { process?: BrowserProcess };

globalScope.process ??= {};
globalScope.process.env ??= {};
globalScope.process.versions ??= {};
