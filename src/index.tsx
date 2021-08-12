import { render } from "react-dom";
import { HashRouter as Router } from "react-router-dom";
import "./index.css";
import Main from "./main";

render(
  <Router>
    <Main />
  </Router>,
  document.getElementById("main")
);
