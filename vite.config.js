import external from "rollup-plugin-external-globals";

const globals = {
  react: "React",
  "react-dom": "ReactDOM",
  "react-router-dom": "ReactRouterDOM",
  mobx: "mobx",
  "mobx-react-lite": "mobxReactLite",
  antd: "antd",
  "@ant-design/icons": "icons",
  md5: "MD5",
};

export default {
  build: { rollupOptions: { plugins: [external(globals)] } },
};
