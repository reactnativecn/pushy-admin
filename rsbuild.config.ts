import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

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
    },
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
    },
  },
  tools: {
    rspack: (config) => {
      if (process.env.BUNDLE_ANALYZE === 'true') {
        config.plugins?.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          }) as any,
        );
      }
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
