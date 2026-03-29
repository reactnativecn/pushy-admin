declare module '*.svg' {
  import type { FunctionComponent, SVGProps } from 'react';

  const content: string;
  export default content;
  export const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module 'bun:test' {
  type TestHandler = () => void | Promise<void>;

  export function describe(name: string, fn: TestHandler): void;
  export function test(name: string, fn: TestHandler): void;
  export function expect<T>(actual: T): {
    toBe(expected: unknown): void;
  };
}

type Tier = import('./types').Tier;

type User = import('./types').User;
type AdminUser = import('./types').AdminUser;
type AdminApp = import('./types').AdminApp;
type AdminVersion = import('./types').AdminVersion;
type Quota = import('./types').Quota;
type App = import('./types').App;
type PackageBase = import('./types').PackageBase;
type Package = import('./types').Package;
type Commit = import('./types').Commit;
type Version = import('./types').Version;
type AppDetail = import('./types').AppDetail;
type SiderMenuProps = import('./types').SiderMenuProps;
type ContentProps = import('./types').ContentProps;
type VersionConfig = import('./types').VersionConfig;
type BindingType = import('./types').BindingType;
type Binding = import('./types').Binding;
type AuditLog = import('./types').AuditLog;
type ApiToken = import('./types').ApiToken;
