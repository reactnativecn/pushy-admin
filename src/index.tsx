import * as React from "react";
import { ConfigProvider } from "antd";
import zhCN from "antd/lib/locale/zh_CN";
import { render } from "react-dom";
import { HashRouter as Router } from "react-router-dom";
// import { DndProvider } from "react-dnd";
// import { HTML5Backend } from "react-dnd-html5-backend";
import "./index.css";
import Main from "./main";

window.React = React;

render(
  <ConfigProvider locale={zhCN}>
    <Router>
      <Main />
    </Router>
  </ConfigProvider>,
  document.getElementById("main")
);
