// 构建期功能开关。rsbuild 会注入 PUBLIC_ 前缀的环境变量;
// 未设置时一律为关闭状态,对应功能的入口与路由均不可达。
export const FEATURES = {
  // 版本健康度视图(消费 /metrics/app/events),数据充分后再放开
  versionHealth: process.env.PUBLIC_ENABLE_VERSION_HEALTH === 'true',
};
