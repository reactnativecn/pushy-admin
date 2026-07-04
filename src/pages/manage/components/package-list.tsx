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
import { type Dispatch, type SetStateAction, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { api } from '@/services/api';
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
  const selectedPackageIdSet = useMemo(
    () => new Set(selectedPackageIds),
    [selectedPackageIds],
  );
  const selectedPackages = useMemo(
    () => dataSource?.filter((item) => selectedPackageIdSet.has(item.id)) ?? [],
    [dataSource, selectedPackageIdSet],
  );
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
  );
};
export default PackageList;

function removeSelectedPackages(
  items: Package[],
  appId: number,
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
      await api.deletePackages({
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
      await api.deletePackage({ appId, packageId: item.id });
    },
  });
}

function edit(item: Package, appId: number, t: (key: string) => string) {
  let { note, status } = item;
  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form layout="vertical" initialValues={item}>
        <Form.Item name="note" label={t('package_list.note')}>
          <Input
            placeholder={t('package_list.add_note')}
            onChange={({ target }) => (note = target.value)}
          />
        </Form.Item>
        <Form.Item name="status" label={t('package_list.status')}>
          <Select
            onSelect={(value: Package['status']) => {
              status = value;
            }}
          >
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
  const hasTimestampWarning = warningTimestamps.length > 0;
  const statusMap: Partial<Record<NonNullable<Package['status']>, string>> = {
    paused: t('package_list.status_map_paused'),
    expired: t('package_list.status_map_expired'),
  };
  return (
    <div className="bg-white my-0 [&_li]:px-0!">
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
                onClick={() => edit(item, appId, t)}
              />
              <Button
                type="link"
                icon={<DeleteOutlined />}
                onClick={() => remove(item, appId, t)}
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
    </div>
  );
};
