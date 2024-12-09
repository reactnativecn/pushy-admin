import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSass } from "@rsbuild/plugin-sass";
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  html: {
    template: "./index.html",
    favicon: "./src/assets/favicon.svg",
  },
  source: {
    entry: {
      index: "./src/index.tsx",
    },
  },
  plugins: [
    pluginReact(),
    pluginSass(),
    pluginSvgr({
      svgrOptions: {
        exportType: "named",
      },
    }),
  ],
});
