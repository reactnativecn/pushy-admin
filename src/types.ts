import { CSSProperties } from "react";

export interface User {
  email: string;
  id: number;
  name: string;
  tier: string;
  tierExpiresAt: string;
}

export interface App {
  id: number;
  name: string;
  platform: "android" | "ios";
}

export type Style = { [name: string]: CSSProperties };
