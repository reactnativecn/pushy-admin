// import { useDrag } from "react-dnd";

import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  List,
  Modal,
  Popover,
  Row,
  Select,
  Tag,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { api } from '@/services/api';
import { useManageContext } from '../hooks/useManageContext';
import { Commit } from './commit';
import { DepsTable } from './deps-table';

const PackageList = ({
  dataSource,
  loading,
}: {
  dataSource?: Package[];
  loading?: boolean;
}) => {
  const { app, appId, packageTimestampWarnings } = useManageContext();
  const [selectedPackageIds, setSelectedPackageIds] = useState<number[]>([]);
  const selectedPackageIdSet = useMemo(
    () => new Set(selectedPackageIds),
    [selectedPackageIds],
  );
  const visiblePackageIds = useMemo(
    () => dataSource?.map((item) => item.id) ?? [],
    [dataSource],
  );
  const selectedPackages = useMemo(
    () => dataSource?.filter((item) => selectedPackageIdSet.has(item.id)) ?? [],
    [dataSource, selectedPackageIdSet],
  );
  const selectedVisibleCount = visiblePackageIds.filter((id) =>
    selectedPackageIdSet.has(id),
  ).length;
  const allVisibleSelected =
    visiblePackageIds.length > 0 &&
    selectedVisibleCount === visiblePackageIds.length;
  const hasSelectedVisiblePackages = selectedPackages.length > 0;
  const realtimeMetricsPath = app?.appKey
    ? `${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
        appKey: app.appKey,
        attribute: 'packageVersion_buildTime',
      }).toString()}`
    : undefined;

  const togglePackageSelection = (packageId: number, checked: boolean) => {
    setSelectedPackageIds((prev) => {
      if (checked) {
        return [...new Set([...prev, packageId])];
      }
      return prev.filter((id) => id !== packageId);
    });
  };

  const toggleAllVisiblePackages = (checked: boolean) => {
    setSelectedPackageIds((prev) => {
      if (checked) {
        return [...new Set([...prev, ...visiblePackageIds])];
      }
      return prev.filter((id) => !visiblePackageIds.includes(id));
    });
  };

  return (
    <>
      {visiblePackageIds.length > 0 && (
        <div className="mb-2 flex items-center gap-2 px-2">
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={selectedVisibleCount > 0 && !allVisibleSelected}
            onChange={({ target }) => {
              toggleAllVisiblePackages(target.checked);
            }}
          />
          {hasSelectedVisiblePackages && (
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() =>
                removeSelectedPackages(selectedPackages, appId, () => {
                  setSelectedPackageIds((prev) =>
                    prev.filter(
                      (id) => !selectedPackages.some((item) => item.id === id),
                    ),
                  );
                })
              }
            >
              删除
            </Button>
          )}
        </div>
      )}
      <List
        loading={loading}
        className="packages"
        size="small"
        dataSource={dataSource}
        renderItem={(item) => (
          <Item
            item={item}
            selected={selectedPackageIdSet.has(item.id)}
            onSelectedChange={(checked) =>
              togglePackageSelection(item.id, checked)
            }
            warningTimestamps={packageTimestampWarnings.get(item.id) ?? []}
            realtimeMetricsPath={realtimeMetricsPath}
          />
        )}
      />
    </>
  );
};
export default PackageList;

function removeSelectedPackages(
  items: Package[],
  appId: number,
  onSuccess: () => void,
) {
  if (items.length === 0) {
    return;
  }
  Modal.confirm({
    title: '删除所选原生包：',
    content: (
      <div className="max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    ),
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await api.deletePackages({
        appId,
        packageIds: items.map((item) => item.id),
      });
      onSuccess();
    },
  });
}

function remove(item: Package, appId: number) {
  Modal.confirm({
    title: `删除后无法恢复，确定删除原生包“${item.name}”？`,
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await api.deletePackage({ appId, packageId: item.id });
    },
  });
}

function edit(item: Package, appId: number) {
  let { note, status } = item;
  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form layout="vertical" initialValues={item}>
        <Form.Item name="note" label="备注">
          <Input
            placeholder="添加原生包备注"
            onChange={({ target }) => (note = target.value)}
          />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select
            onSelect={(value: Package['status']) => {
              status = value;
            }}
          >
            <Select.Option value="normal">正常</Select.Option>
            <Select.Option value="paused">暂停</Select.Option>
            <Select.Option value="expired">过期</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    ),
    async onOk() {
      await api.updatePackage({
        appId,
        packageId: item.id,
        params: { note, status },
      });
    },
  });
}

const TimestampWarning = ({
  warningTimestamps,
  realtimeMetricsPath,
}: {
  warningTimestamps: string[];
  realtimeMetricsPath: string;
}) => (
  <Popover
    trigger="hover"
    content={
      <div className="max-w-72 text-xs leading-5">
        <div>发现不同时间戳：</div>
        <div className="mt-1 break-all text-gray-700">
          {warningTimestamps.map((timestamp) => (
            <div key={timestamp}>{timestamp}</div>
          ))}
        </div>
        <div className="mt-2">
          需要在应用设置中打开“忽略时间戳”选项，否则这些包无法获得热更新。
        </div>
        <div className="mt-1">
          <Link to={realtimeMetricsPath}>点击此处查看实时数据</Link>
        </div>
      </div>
    }
  >
    <span className="ml-2 inline-flex cursor-help items-center text-amber-500">
      <ExclamationCircleFilled />
    </span>
  </Popover>
);

const Item = ({
  item,
  selected,
  onSelectedChange,
  warningTimestamps,
  realtimeMetricsPath,
}: {
  item: Package;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  warningTimestamps: string[];
  realtimeMetricsPath?: string;
}) => {
  const { appId } = useManageContext();
  const hasTimestampWarning = warningTimestamps.length > 0;
  return (
    <div className="bg-white my-0 [&_li]:px-0!">
      <List.Item className="p-2">
        <List.Item.Meta
          title={
            <Row align="middle">
              <Checkbox
                className="mr-2"
                checked={selected}
                onChange={({ target }) => onSelectedChange(target.checked)}
              />
              <Col flex={1}>
                <div className="flex flex-wrap items-center">
                  <span>{item.name}</span>
                  {hasTimestampWarning && realtimeMetricsPath && (
                    <TimestampWarning
                      warningTimestamps={warningTimestamps}
                      realtimeMetricsPath={realtimeMetricsPath}
                    />
                  )}
                  {item.status && item.status !== 'normal' && (
                    <Tag className="ml-2">{status[item.status]}</Tag>
                  )}
                </div>
              </Col>
              <DepsTable deps={item.deps} name={`原生包 ${item.name}`} />
              <Commit commit={item.commit} />
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => edit(item, appId)}
              />
              <Button
                type="link"
                icon={<DeleteOutlined />}
                onClick={() => remove(item, appId)}
                danger
              />
            </Row>
          }
          description={
            <div>
              {item.note && (
                <Typography.Paragraph
                  className="mb-0"
                  type="secondary"
                  ellipsis={{ tooltip: item.note }}
                >
                  备注：{item.note}
                </Typography.Paragraph>
              )}
              <div className="text-xs flex flex-col gap-1">
                <div>编译时间：{item.buildTime}</div>
              </div>
            </div>
          }
        />
      </List.Item>
    </div>
  );
};
const status: Partial<Record<NonNullable<Package['status']>, string>> = {
  paused: '暂停',
  expired: '过期',
};
