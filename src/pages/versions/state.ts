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
