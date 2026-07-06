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
import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import {
  useDeletePackage,
  useDeletePackages,
  useUpdatePackage,
} from '@/services/mutations';
import type { Package } from '@/types';
import { useManageContext } from '../hooks/useManageContext';
import { Commit } from './commit';
import { DepsTable } from './deps-table';

const PackageList = ({
  dataSource,
  loading,
  selectedPackageIds,
  setSelectedPackageIds,
}: {
  dataSource?: Package[];
  loading?: boolean;
  selectedPackageIds: number[];
  setSelectedPackageIds: Dispatch<SetStateAction<number[]>>;
}) => {
  const { t } = useTranslation();
  const { app, appId, packageTimestampWarnings } = useManageContext();
  const deletePackages = useDeletePackages();
  const selectedPackageIdSet = useMemo(
    () => new Set(selectedPackageIds),
    [selectedPackageIds],
  );
  const selectedPackages = useMemo(
    () => dataSource?.filter((item) => selectedPackageIdSet.has(item.id)) ?? [],
    [dataSource, selectedPackageIdSet],
  );
  const hasSelectedVisiblePackages = selectedPackages.length > 0;
  // 带上告警的计算窗口（7 天）和被标记的时间戳，让实时页打开时
  // 就能定位到这些类别（否则默认 24h 窗口 + Top10 图例会把它们藏掉）
  const buildRealtimeMetricsPath = (item: Package, timestamps: string[]) =>
    app?.appKey
      ? `${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
          appKey: app.appKey,
          attribute: 'packageVersion_buildTime',
          range: '7d',
          focus: timestamps
            .map((timestamp) => `${item.name}_${timestamp}`)
            .join(','),
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

  return (
    <List
      loading={loading}
      className="packages"
      size="small"
      dataSource={dataSource}
      footer={
        hasSelectedVisiblePackages ? (
          <div className="px-2">
            <Button
              className="w-full sm:w-auto"
              danger
              icon={<DeleteOutlined />}
              onClick={() =>
                removeSelectedPackages(
                  selectedPackages,
                  appId,
                  deletePackages.mutateAsync,
                  () => {
                    setSelectedPackageIds((prev) =>
                      prev.filter(
                        (id) =>
                          !selectedPackages.some((item) => item.id === id),
                      ),
                    );
                  },
                  t,
                )
              }
            >
              {t('package_list.delete_button')}
            </Button>
          </div>
        ) : undefined
      }
      renderItem={(item) => {
        const warningTimestamps = packageTimestampWarnings.get(item.id) ?? [];
        return (
          <Item
            item={item}
            selected={selectedPackageIdSet.has(item.id)}
            onSelectedChange={(checked) =>
              togglePackageSelection(item.id, checked)
            }
            warningTimestamps={warningTimestamps}
            realtimeMetricsPath={buildRealtimeMetricsPath(
              item,
              warningTimestamps,
            )}
          />
        );
      }}
    />
  );
};
export default PackageList;

function removeSelectedPackages(
  items: Package[],
  appId: number,
  deletePackages: (variables: {
    appId: number;
    packageIds: number[];
  }) => Promise<unknown>,
  onSuccess: () => void,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  if (items.length === 0) {
    return;
  }
  Modal.confirm({
    title: t('package_list.batch_delete_title'),
    content: (
      <div>
        <Typography.Paragraph type="danger">
          {t('package_list.batch_delete_warning')}
        </Typography.Paragraph>
        <div className="max-h-48 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id}>{item.name}</div>
          ))}
        </div>
      </div>
    ),
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await deletePackages({
        appId,
        packageIds: items.map((item) => item.id),
      });
      onSuccess();
    },
  });
}

function remove(
  item: Package,
  appId: number,
  deletePackage: (variables: {
    appId: number;
    packageId: number;
  }) => Promise<unknown>,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  Modal.confirm({
    title: t('package_list.single_delete_title', { name: item.name }),
    content: (
      <Typography.Paragraph type="danger">
        {t('package_list.single_delete_warning')}
      </Typography.Paragraph>
    ),
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await deletePackage({ appId, packageId: item.id });
    },
  });
}

const EditPackageModal = ({
  item,
  appId,
  onClose,
}: {
  item: Package;
  appId: number;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<{
    note?: string;
    status?: Package['status'];
  }>();
  const updatePackage = useUpdatePackage();

  return (
    <Modal
      open
      maskClosable
      confirmLoading={updatePackage.isPending}
      onCancel={onClose}
      onOk={async () => {
        const { note, status } = await form.validateFields();
        try {
          await updatePackage.mutateAsync({
            appId,
            packageId: item.id,
            params: { note, status },
          });
        } catch {
          // request layer already toasts the error; keep the modal open
          return;
        }
        onClose();
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ note: item.note, status: item.status }}
      >
        <Form.Item name="note" label={t('package_list.note')}>
          <Input placeholder={t('package_list.add_note')} />
        </Form.Item>
        <Form.Item name="status" label={t('package_list.status')}>
          <Select>
            <Select.Option value="normal">
              {t('package_list.status_normal')}
            </Select.Option>
            <Select.Option value="paused">
              {t('package_list.status_paused')}
            </Select.Option>
            <Select.Option value="expired">
              {t('package_list.status_expired')}
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

const TimestampWarning = ({
  warningTimestamps,
  realtimeMetricsPath,
}: {
  warningTimestamps: string[];
  realtimeMetricsPath: string;
}) => {
  const { t } = useTranslation();
  return (
    <Popover
      trigger="hover"
      content={
        <div className="max-w-72 text-xs leading-5">
          <div>{t('package_list.mismatch_title')}</div>
          <div className="mt-1 break-all text-gray-700">
            {warningTimestamps.map((timestamp) => (
              <div key={timestamp}>{timestamp}</div>
            ))}
          </div>
          <div className="mt-2">{t('package_list.mismatch_desc')}</div>
          <div className="mt-1">
            <Link to={realtimeMetricsPath}>
              {t('package_list.view_realtime')}
            </Link>
          </div>
        </div>
      }
    >
      <span className="ml-2 inline-flex cursor-help items-center text-amber-500">
        <ExclamationCircleFilled />
      </span>
    </Popover>
  );
};

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
  const { t } = useTranslation();
  const { appId } = useManageContext();
  const deletePackage = useDeletePackage();
  const [editing, setEditing] = useState(false);
  const hasTimestampWarning = warningTimestamps.length > 0;
  const statusMap: Partial<Record<NonNullable<Package['status']>, string>> = {
    paused: t('package_list.status_map_paused'),
    expired: t('package_list.status_map_expired'),
  };
  return (
    <div className="bg-container my-0 [&_li]:px-0!">
      <List.Item className="p-2">
        <List.Item.Meta
          title={
            <Row align="middle" className="w-full" wrap={false}>
              <Col flex="none" className="pr-4 leading-none">
                <Checkbox
                  checked={selected}
                  onChange={({ target }) => onSelectedChange(target.checked)}
                />
              </Col>
              <Col flex="auto" className="min-w-0">
                <div className="flex flex-wrap items-center">
                  <span>{item.name}</span>
                  {hasTimestampWarning && realtimeMetricsPath && (
                    <TimestampWarning
                      warningTimestamps={warningTimestamps}
                      realtimeMetricsPath={realtimeMetricsPath}
                    />
                  )}
                  {item.status && item.status !== 'normal' && (
                    <Tag className="ml-2">{statusMap[item.status]}</Tag>
                  )}
                </div>
              </Col>
              <DepsTable
                deps={item.deps}
                name={t('deps_table.native_package_with_name', {
                  name: item.name,
                })}
              />
              <Commit commit={item.commit} />
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => setEditing(true)}
              />
              <Button
                type="link"
                icon={<DeleteOutlined />}
                onClick={() =>
                  remove(item, appId, deletePackage.mutateAsync, t)
                }
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
                  {t('package_list.note_prefix')}
                  {item.note}
                </Typography.Paragraph>
              )}
              <div className="text-xs flex flex-col gap-1">
                <div>
                  {t('package_list.build_time')}
                  {item.buildTime}
                </div>
              </div>
            </div>
          }
        />
      </List.Item>
      {editing && (
        <EditPackageModal
          item={item}
          appId={appId}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
};
