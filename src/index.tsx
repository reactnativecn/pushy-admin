import * as React from "react";
import { render } from "react-dom";
import { HashRouter as Router } from "react-router-dom";
import Main from "./main";
import "./style";

render(
  <Router>
    <Main />
  </Router>,
  document.getElementById("main")
);
