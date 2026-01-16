import { SettingFilled } from '@ant-design/icons';
import {
  Breadcrumb,
  Button,
  Col,
  Form,
  Layout,
  Modal,
  message,
  Row,
  Space,
  Tabs,
  Tag,
} from 'antd';

import { Link, useParams } from 'react-router-dom';
import './manage.css';

import { useEffect } from 'react';
import PlatformIcon from '@/components/platform-icon';
import { api } from '@/services/api';
import { useApp } from '@/utils/hooks';
import PackageList from './components/package-list';
import SettingModal from './components/setting-modal';
import VersionTable from './components/version-table';
import { ManageProvider, useManageContext } from './hooks/useManageContext';

const ManageDashBoard = () => {
  const { packages, unusedPackages, packagesLoading } = useManageContext();
  return (
    <Layout className="manage-layout">
      <Layout.Sider
        theme="light"
        className="manage-sider p-4 pt-0 mr-4 h-full rounded-lg"
        width={240}
      >
        <div className="py-4">原生包</div>
        <Tabs
          items={[
            {
              key: 'all',
              label: '全部',
              children: (
                <PackageList dataSource={packages} loading={packagesLoading} />
              ),
            },
            {
              key: 'unused',
              label: '未使用',
              children: (
                <PackageList
                  dataSource={unusedPackages}
                  loading={packagesLoading}
                />
              ),
            },
          ]}
        />
      </Layout.Sider>
      <Layout.Content className="p-0! manage-content">
        <VersionTable />
      </Layout.Content>
    </Layout>
  );
};

export const Manage = () => {
  const [modal, contextHolder] = Modal.useModal();
  const params = useParams<{ id?: string }>();
  const id = Number(params.id!);
  const { app } = useApp(id);
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
                title: <Link to="/apps">应用列表</Link>,
              },
              {
                title: (
                  <>
                    <PlatformIcon platform={app?.platform} className="mr-1" />
                    {app?.name}
                    {app?.status === 'paused' && (
                      <Tag className="ml-2">暂停</Tag>
                    )}
                  </>
                ),
              },
            ]}
          />
        </Col>
        <Space.Compact className="w-full md:w-auto">
          <Button
            type="primary"
            icon={<SettingFilled />}
            className="w-full md:w-auto"
            onClick={() => {
              modal.confirm({
                icon: null,
                closable: true,
                maskClosable: true,
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
        </Space.Compact>
      </Row>
      <ManageProvider appId={id}>
        {contextHolder}
        <ManageDashBoard />
      </ManageProvider>
    </Form>
  );
};
export const Component = Manage;
