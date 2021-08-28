import { Spin } from "antd";
import { observer } from "mobx-react-lite";
import Layout from "./layout";
import Login from "./pages/login";
import store from "./store";
import { useHistory } from "react-router-dom";

export default observer(() => {
  store.history = useHistory();
  if (!store.token) return <Login />;
  if (!store.user) {
    return (
      <div style={style.spin}>
        <Spin size="large" />
      </div>
    );
  }
  return <Layout />;
});

const style: Style = {
  spin: { lineHeight: "100vh", textAlign: "center" },
};
