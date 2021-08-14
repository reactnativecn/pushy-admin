import { Form, Modal, Spin, Typography } from "antd";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import request from "../../request";

const state = observable.object<{ app?: AppDetail }>({});

export default function (app: App) {
  if (app.id != state.app?.id) {
    state.app = undefined;
  }

  request("get", `app/${app.id}`).then((app) => {
    runInAction(() => (state.app = app));
  });

  Modal.confirm({
    icon: null,
    content: <Content />,
    onOk() {
      app.name = state.app!.name;
      return request("put", `app/${app.id}`, state.app);
    },
  });
}

const Content = observer(() => {
  const { app } = state;
  if (!app) return <Spin />;

  return (
    <Form layout="vertical">
      <Form.Item label="应用名">
        <Typography.Paragraph
          type="secondary"
          style={style.item}
          editable={{ onChange: (value) => runInAction(() => (app.name = value)) }}
        >
          {app.name}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label="应用 Key">
        <Typography.Paragraph style={style.item} type="secondary" copyable>
          {app.appKey}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label="下载地址">
        <Typography.Paragraph
          type="secondary"
          style={style.item}
          editable={{ onChange: (value) => runInAction(() => (app.downloadUrl = value)) }}
        >
          {app.downloadUrl ?? ""}
        </Typography.Paragraph>
      </Form.Item>
    </Form>
  );
});

const style: Style = { item: { marginBottom: 0 } };
