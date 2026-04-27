import { LineChartOutlined, SettingFilled } from '@ant-design/icons';
import {
  Breadcrumb,
  Button,
  Col,
  Form,
  Grid,
  Layout,
  Modal,
  message,
  Row,
  Space,
  Tabs,
  Tag,
} from 'antd';

import { useParams } from 'react-router-dom';
import './manage.css';

import { useEffect } from 'react';
import PlatformIcon from '@/components/platform-icon';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { useApp } from '@/utils/hooks';
import PackageList from './components/package-list';
import SettingModal from './components/setting-modal';
import VersionTable from './components/version-table';
import { ManageProvider, useManageContext } from './hooks/useManageContext';

const ManageDashBoard = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { packages, unusedPackages, packagesLoading } = useManageContext();
  const packageTabItems = [
    {
      key: 'all',
      label: '全部',
      children: <PackageList dataSource={packages} loading={packagesLoading} />,
    },
    {
      key: 'unused',
      label: '未使用',
      children: (
        <PackageList dataSource={unusedPackages} loading={packagesLoading} />
      ),
    },
  ];

  if (isMobile) {
    return (
      <Tabs
        defaultActiveKey="versions"
        size="small"
        items={[
          {
            key: 'versions',
            label: '热更包',
            children: <VersionTable />,
          },
          {
            key: 'packages',
            label: '原生包',
            children: (
              <div className="rounded-lg bg-white px-4 pb-4 pt-1">
                <Tabs
                  defaultActiveKey="all"
                  size="small"
                  items={packageTabItems}
                />
              </div>
            ),
          },
        ]}
      />
    );
  }

  return (
    <Layout className="manage-layout">
      <Layout.Sider
        theme="light"
        className="manage-sider h-full rounded-lg p-4 pt-0"
        width={240}
        style={{ marginRight: 16, maxWidth: '100%' }}
      >
        <div className="py-4">原生包</div>
        <Tabs size="middle" items={packageTabItems} />
      </Layout.Sider>
      <Layout.Content className="p-0! manage-content" style={{ minWidth: 0 }}>
        <VersionTable />
      </Layout.Content>
    </Layout>
  );
};

export const Manage = () => {
  const [modal, contextHolder] = Modal.useModal();
  const screens = Grid.useBreakpoint();
  const params = useParams<{ id?: string }>();
  const id = Number(params.id!);
  const { app } = useApp(id);
  const realtimeMetricsPath = app?.appKey
    ? `${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
        appKey: app.appKey,
      }).toString()}`
    : undefined;
  const [form] = Form.useForm<App>();
  useEffect(() => {
    if (app) {
      form.setFieldsValue(app);
    }
  }, [app, form]);

  return (
    <Form layout="vertical" form={form} initialValues={app}>
      <Row className="mb-4 flex-col gap-3 md:flex-row md:items-center">
        <Col flex={1} className="min-w-0">
          <Breadcrumb
            items={[
              {
                title: '应用',
              },
              {
                title: (
                  <span className="inline-flex max-w-full items-center gap-1">
                    <PlatformIcon platform={app?.platform} className="mr-1" />
                    <span className="max-w-[160px] truncate md:max-w-none">
                      {app?.name}
                    </span>
                    {app?.status === 'paused' && (
                      <Tag className="ml-2">暂停</Tag>
                    )}
                  </span>
                ),
              },
            ]}
          />
        </Col>
        <Space.Compact
          direction={!screens.md ? 'vertical' : 'horizontal'}
          className="w-full md:w-auto"
        >
          <Button
            type="primary"
            icon={<SettingFilled />}
            className="w-full md:w-auto"
            onClick={() => {
              modal.confirm({
                icon: null,
                closable: true,
                maskClosable: true,
                width: !screens.md ? 'calc(100vw - 32px)' : 520,
                content: <SettingModal />,
                async onOk() {
                  try {
                    await api.updateApp(id, {
                      name: form.getFieldValue('name') as string,
                      downloadUrl: form.getFieldValue('downloadUrl') as string,
                      status: form.getFieldValue('status') as
                        | 'normal'
                        | 'paused',
                      ignoreBuildTime: form.getFieldValue('ignoreBuildTime') as
                        | 'enabled'
                        | 'disabled',
                    });
                  } catch (e) {
                    message.error((e as Error).message);
                    return;
                  }
                  message.success('修改成功');
                },
              });
            }}
          >
            应用设置
          </Button>
          <Button
            icon={<LineChartOutlined />}
            className="w-full md:w-auto"
            disabled={!realtimeMetricsPath}
            onClick={() => {
              if (realtimeMetricsPath) {
                router.navigate(realtimeMetricsPath);
              }
            }}
          >
            实时数据
          </Button>
        </Space.Compact>
      </Row>
      <ManageProvider appId={id} app={app}>
        {contextHolder}
        <ManageDashBoard />
      </ManageProvider>
    </Form>
  );
};
export const Component = Manage;
