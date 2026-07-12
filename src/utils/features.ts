// 构建期紧急关闭开关。rsbuild 会注入 PUBLIC_ 前缀的环境变量；
// 版本健康度默认开启，仅显式设置为 false 时隐藏入口与路由。
const versionHealthMock =
  process.env.NODE_ENV !== 'production' &&
  process.env.PUBLIC_VERSION_HEALTH_MOCK === 'true';

export const FEATURES = {
  // 版本健康度视图（消费 /metrics/app/events）
  versionHealth:
    versionHealthMock || process.env.PUBLIC_ENABLE_VERSION_HEALTH !== 'false',
  versionHealthMock,
};
