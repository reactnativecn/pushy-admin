import { execFileSync } from 'node:child_process';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSvgr } from '@rsbuild/plugin-svgr';

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
    const dirty = git('status', '--porcelain') !== '';
    return `${date}-${commit}${dirty ? '-dirty' : ''}`;
  } catch {
    // 没有 git 历史的 CI 检出（Netlify、GitHub Actions）至少知道自己是哪个提交。
    const commit = (
      process.env.COMMIT_REF ??
      process.env.GITHUB_SHA ??
      ''
    ).slice(0, 8);
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
