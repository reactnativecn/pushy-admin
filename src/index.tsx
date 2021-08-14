import { ConfigProvider } from "antd";
import zhCN from "antd/lib/locale/zh_CN";
import { render } from "react-dom";
import { HashRouter as Router } from "react-router-dom";
import "./index.css";
import Main from "./main";

render(
  <ConfigProvider locale={zhCN}>
    <Router>
      <Main />
    </Router>
  </ConfigProvider>,
  document.getElementById("main")
);
