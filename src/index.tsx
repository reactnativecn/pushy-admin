import * as React from "react";
import { render } from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import "./index.css";
import Main from "./main";
import { init } from "./store";

window.React = React;
init();

render(
  <Router>
    <Main />
  </Router>,
  document.getElementById("main")
);
