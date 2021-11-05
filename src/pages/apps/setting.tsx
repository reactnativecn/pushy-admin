import { Form, message, Modal, Spin, Typography, Switch } from "antd";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import request, { RequestError } from "../../request";
import store from "../../store";
import { default as versionPageState } from "../versions/state";

const state = observable.object<{ app?: AppDetail }>({});

export default function (app: App) {
  if (app.id != state.app?.id) {
    state.app = undefined;
  }

  request("get", `app/${app.id}`).then((app) => {
    runInAction(() => {
      state.app = app;
    });
  });

  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: <Content />,
    async onOk() {
      try {
        await request("put", `app/${app.id}`, state.app);
      } catch (error) {
        message.success((error as RequestError).message);
      }

      runInAction(() => {
        app.name = state.app!.name;
        Object.assign(
          store.apps.find((i) => i.id == app.id),
          state.app
        );
        versionPageState.app = state.app;
      });
      message.success("修改成功");
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
      <Form.Item>
        <Switch
          checkedChildren="启用"
          unCheckedChildren="暂停"
          checked={app.status !== "paused"}
          onChange={(checked) => runInAction(() => (app.status = checked ? "normal" : "paused"))}
        />
      </Form.Item>
    </Form>
  );
});

const style: Style = { item: { marginBottom: 0 } };
