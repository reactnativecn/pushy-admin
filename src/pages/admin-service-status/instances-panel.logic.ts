import type { SystemDeployStatus, SystemInstance } from '@/types';

/** 实例面板的纯逻辑:行数据拼装、节点级部署状态归并 */

export interface InstanceRow extends SystemInstance {
  deployStatus?: SystemDeployStatus;
}

// installing/restarting 是进行中，failed 只作为事后提示
export const DEPLOY_STATUS_PRIORITY: Record<
  SystemDeployStatus['status'],
  number
> = {
  installing: 0,
  restarting: 1,
  failed: 2,
};

export function isDeployBusy(
  status: SystemDeployStatus | undefined,
): status is SystemDeployStatus {
  return status != null && status.status !== 'failed';
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

/** 把心跳里的部署状态挂到对应实例上,按 id 排序让表格顺序稳定 */
export function buildInstanceRows(
  data:
    | {
        data?: SystemInstance[];
        deployStatuses?: Record<string, SystemDeployStatus>;
      }
    | undefined,
): InstanceRow[] {
  const instances = data?.data ?? [];
  const deployStatuses = data?.deployStatuses ?? {};
  return instances
    .map((instance) => ({
      ...instance,
      deployStatus: deployStatuses[instance.id],
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

// 更新/回滚是节点级的：bun i -g 全局装一次，server/worker 一起滚动重启
export function getNodeVersion(rows: InstanceRow[]) {
  return rows.find((row) => row.role === 'server')?.version ?? rows[0]?.version;
}

// 节点级部署状态直接体现在更新按钮上：进行中优先，其次是最近一次失败
export function pickNodeDeployStatus(
  rows: InstanceRow[],
): SystemDeployStatus | undefined {
  const statuses = rows
    .map((row) => row.deployStatus)
    .filter((status): status is SystemDeployStatus => status != null);
  statuses.sort(
    (left, right) =>
      DEPLOY_STATUS_PRIORITY[left.status] -
        DEPLOY_STATUS_PRIORITY[right.status] ||
      right.updatedAt.localeCompare(left.updatedAt),
  );
  return statuses[0];
}
