import { Modal } from 'antd';
import { observable, runInAction } from 'mobx';
import request from '../../services/request';
import { rootRouterPath, router } from '../../router';
import { resetAppList } from '@/utils/queryClient';

const state = observable.object({
  apps: observable.array<App>(),
  loading: false,
});

export default state;

export async function getApp(id: number | string) {
  if (!state.apps.length) {
    const { data } = await request('get', '/app/list');
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
      await request('delete', `/app/${app.id}`);
      Modal.destroyAll();
      resetAppList();
      // fetchApps();
      router.navigate(rootRouterPath.apps);
    },
  });
}
