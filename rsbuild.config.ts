import { execFileSync } from 'node:child_process';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSvgr } from '@rsbuild/plugin-svgr';

// CI 正在构建的那个提交，变量名各家不同。它有值这件事本身也说明工作区是 CI
// 自己的检出：那里的"脏"是构建过程碰了文件，而不是有人把没提交的改动发上线。
const ciCommit =
  process.env.WORKERS_CI_COMMIT_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  process.env.COMMIT_REF ??
  '';
// 有的构建平台压根不给提交号，所以 CI 这个变量本身是第二个信号。
const inCI =
  ciCommit !== '' || process.env.CI === 'true' || process.env.CI === '1';

// 前端自己的版本号，形如 2026.8.24-abcd1234：提交日期（UTC，月日不补零）加
// 提交哈希前 8 位，和后端 /status 里的 version 同一套写法。页脚把两个都印出来，
// 是因为它们各自部署：CDN 上一份过期的界面配着刚上线的后端，只有并排看才认得出来。
function uiVersion(): string {
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      encoding: 'utf8',
      // 日期必须按 UTC 算，否则和后端报的版本号对不上。
      env: { ...process.env, TZ: 'UTC' },
    }).trim();
  try {
    const date = git(
      'log',
      '-1',
      '--format=%cd',
      '--date=format-local:%Y.%-m.%-d',
    );
    const commit = git('rev-parse', 'HEAD').slice(0, 8);
    // 只看已跟踪文件，在 CI 里连这个也不看：CI 工作区里总躺着装好的依赖和构建
    // 产物，部署流水线还可能顺手改写某个已跟踪的配置文件。这些都不改变编译的
    // 是哪个提交。
    const dirty =
      !inCI && git('status', '--porcelain', '--untracked-files=no') !== '';
    return `${date}-${commit}${dirty ? '-dirty' : ''}`;
  } catch {
    // 没有 git 历史的检出，至少还知道自己在构建哪个提交。
    const commit = ciCommit.slice(0, 8);
    if (!commit) return 'dev';
    const now = new Date();
    return `${now.getUTCFullYear()}.${now.getUTCMonth() + 1}.${now.getUTCDate()}-${commit}`;
  }
}

export default defineConfig({
  html: {
    template: './index.html',
    favicon: './src/assets/favicon.svg',
  },
  source: {
    entry: {
      index: './src/index.tsx',
    },
    preEntry: './src/process-shim.ts',
    define: {
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV ?? 'development',
      ),
      'process.env.PUBLIC_UI_VERSION': JSON.stringify(uiVersion()),
    },
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
    },
  },
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
    pluginSvgr({
      svgrOptions: {
        exportType: 'named',
      },
    }),
  ],
});
