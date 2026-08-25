// 与服务端 TOKEN_ALLOWED_SCOPES 一致
export const API_TOKEN_SCOPES = [
  'app:read',
  'app:write',
  'app:delete',
  'bundle:upload',
  'version:publish',
  'version:delete',
] as const;
export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number];

// 只列出当前真有工具支撑的 scope;服务端 ALL_MCP_SCOPES 比这里宽,
// 新工具上线时再把对应项加进来。
export const MCP_SCOPES = ['pushy:apps:read', 'pushy:diagnose'] as const;
export type McpScope = (typeof MCP_SCOPES)[number];
