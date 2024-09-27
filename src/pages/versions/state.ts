import { Modal } from 'antd';
import { TablePaginationConfig } from 'antd/lib/table';
import request from '@/services/request';

type State = { app?: App; pagination: TablePaginationConfig };

const state = {
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
};

export default state;

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
  request('get', `/app/${state.app?.id}/version/list?${params}`).then(({ data, count }: any) => {
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
        await request('delete', `/app/${state.app?.id}/version/${id}`);
      }
      fetchPackages();
      fetchVersions(1);
    },
  });
}

export async function bindPackage(packageId: number, versionId: number) {
  runInAction(() => (state.loading = true));
  await request('put', `/app/${state.app?.id}/package/${packageId}`, { versionId });
  fetchPackages();
  fetchVersions(state.pagination.current);
}
