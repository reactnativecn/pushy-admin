import { Modal } from 'antd';
import { TablePaginationConfig } from 'antd/lib/table';
import { observable, runInAction } from 'mobx';
import request from '../../request';
import store from '../../store';

const initState = {
  loading: false,
  packages: observable.array<Package>(),
  versions: observable.array<Version>(),
  unused: observable.array<Package>(),
  selected: observable.array<number>(),
};

type State = typeof initState & { app?: App; pagination: TablePaginationConfig };

const state = observable.object<State>({
  ...initState,
  pagination: {
    pageSize: 10,
    showTotal: (total) => `共 ${total} 个 `,
    onChange(page, size) {
      if (size) {
        state.pagination.pageSize = size;
      }
      fetchVersions(page);
    },
  },
});

export default state;

export function fetchData(id: number) {
  if (state.app?.id === id) return;

  runInAction(() => {
    state.app = store.apps.find((i) => i.id === id);
    state.packages = observable.array();
    state.versions = observable.array();
  });
  request('get', `app/${id}`).then((app) => runInAction(() => (state.app = app)));
  fetchPackages();
  fetchVersions();
}

export function fetchPackages() {
  const { app } = state;
  if (!app) return;
  request('get', `app/${app?.id}/package/list?limit=1000`).then(({ data }) =>
    runInAction(() => {
      state.packages = data;
      state.unused = data.filter((i) => i.version === null);
    })
  );
}

export function fetchVersions(page?: number) {
  if (!state.app) return;
  if (page === undefined) {
    if (state.versions.length) return;
    page = 1;
  }

  runInAction(() => {
    state.loading = true;
    state.pagination.current = page;
  });
  const { pageSize } = state.pagination;
  const params = `offset=${(page - 1) * pageSize!}&limit=${pageSize}`;
  request('get', `app/${state.app?.id}/version/list?${params}`).then(({ data, count }: any) => {
    runInAction(() => {
      state.pagination.total = count;
      state.versions = data;
      state.loading = false;
    });
  });
}

export function removeSelectedVersions() {
  const { selected, versions } = state;
  const map = versions.reduce<{ [key: number]: string }>((m, { id, name }) => {
    m[id] = name;
    return m;
  }, {});
  Modal.confirm({
    title: '删除所选热更新包：',
    content: selected.map((i) => map[i]).join('，'),
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      for (const id of selected) {
        await request('delete', `app/${state.app?.id}/version/${id}`);
      }
      fetchPackages();
      fetchVersions(1);
    },
  });
}

export async function bindPackage(packageId: number, versionId: number) {
  runInAction(() => (state.loading = true));
  await request('put', `app/${state.app?.id}/package/${packageId}`, { versionId });
  fetchPackages();
  fetchVersions(state.pagination.current);
}
