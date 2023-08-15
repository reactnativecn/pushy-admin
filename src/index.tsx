// import * as React from "react";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { createRoot } from "react-dom/client";
import { HashRouter as Router } from "react-router-dom";
// import { DndProvider } from "react-dnd";
// import { HTML5Backend } from "react-dnd-html5-backend";
import "./index.css";
import Main from "./main";

// window.React = React;
createRoot(document.getElementById("main")!).render(
  <ConfigProvider locale={zhCN}>
    <Router>
      <Main />
    </Router>
  </ConfigProvider>
);
