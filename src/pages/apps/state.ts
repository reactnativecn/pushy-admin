import { Modal } from 'antd';
import { observable, runInAction } from 'mobx';
import request from '../../request';
import store, { fetchApps } from '../../store';
import { API } from '../../api';

const state = observable.object({
  apps: observable.array<App>(),
  loading: false,
});

export default state;

export function fetch() {
  runInAction(() => (state.loading = true));
  request('get', API.listUrl).then(({ data }) =>
    runInAction(() => {
      state.apps = data;
      state.loading = false;
    })
  );
}

export async function getApp(id: number | string) {
  if (!state.apps.length) {
    const { data } = await request('get', API.listUrl);
    runInAction(() => (state.apps = data));
  }
  return state.apps.find((i) => i.id === id);
}

export function removeApp(app: App) {
  Modal.confirm({
    title: '应用删除后无法恢复',
    okText: '确认删除',
    okButtonProps: { danger: true },
    async onOk() {
      await request('delete', `app/${app.id}`);
      fetchApps();
      store.history.replace(API.appsUrl);
    },
  });
}
