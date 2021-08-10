import { CSSProperties } from "react";

export interface User {
  email: string;
  id: number;
  name: string;
  tier: string;
  tierExpiresAt: string;
}

export type Style = { [name: string]: CSSProperties };
