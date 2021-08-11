type Style = { [name: string]: import("react").CSSProperties };

declare module "*.svg";
declare module "*.png";
declare module "*.jpg";

interface User {
  email: string;
  id: number;
  name: string;
  tier: "free" | "standard" | "premium" | "pro";
  tierExpiresAt?: string;
}

interface App {
  id: number;
  name: string;
  platform: "android" | "ios";
}
