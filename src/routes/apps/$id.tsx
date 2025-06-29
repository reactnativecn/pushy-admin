import { SettingFilled } from "@ant-design/icons";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
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
} from "antd";
import "./-manage/index.scss";

import { useEffect } from "react";
import PlatformIcon from "@/components/platform-icon";
import { api } from "@/services/api";
import { useApp } from "@/utils/hooks";
import PackageList from "./-manage/components/package-list";
import SettingModal from "./-manage/components/setting-modal";
import VersionTable from "./-manage/components/version-table";
import {
  ManageProvider,
  useManageContext,
} from "./-manage/hooks/useManageContext";

const ManageDashBoard = () => {
  const { packages, unusedPackages, packagesLoading } = useManageContext();
  return (
    <Layout>
      <Layout.Sider
        theme="light"
        className="p-4 pt-0 mr-4 h-full rounded-lg"
        width={240}
      >
        <div className="py-4">原生包</div>
        <Tabs>
          <Tabs.TabPane tab="全部" key="all">
            <PackageList dataSource={packages} loading={packagesLoading} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="未使用" key="unused">
            <PackageList
              dataSource={unusedPackages}
              loading={packagesLoading}
            />
          </Tabs.TabPane>
        </Tabs>
      </Layout.Sider>
      <Layout.Content className="!p-0">
        <VersionTable />
      </Layout.Content>
    </Layout>
  );
};

function AppDetailComponent() {
  const [modal, contextHolder] = Modal.useModal();
  const { id } = useParams({ from: "/apps/$id" });
  const appId = Number(id);
  const { app } = useApp(appId);
  const [form] = Form.useForm<App>();
  useEffect(() => {
    if (app) {
      form.setFieldsValue(app);
    }
  }, [app, form]);

  return (
    <Form layout="vertical" form={form} initialValues={app}>
      <Row className="mb-4">
        <Col flex={1}>
          <Breadcrumb>
            <Breadcrumb.Item>
              <Link to="/apps">应用列表</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <PlatformIcon platform={app?.platform} className="mr-1" />
              {app?.name}
              {app?.status === "paused" && <Tag className="ml-2">暂停</Tag>}
            </Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Space.Compact>
          <Button
            type="primary"
            icon={<SettingFilled />}
            onClick={() => {
              modal.confirm({
                icon: null,
                closable: true,
                maskClosable: true,
                content: <SettingModal />,
                async onOk() {
                  try {
                    await api.updateApp(appId, {
                      name: form.getFieldValue("name") as string,
                      downloadUrl: form.getFieldValue("downloadUrl") as string,
                      status: form.getFieldValue("status") as
                        | "normal"
                        | "paused",
                      ignoreBuildTime: form.getFieldValue("ignoreBuildTime") as
                        | "enabled"
                        | "disabled",
                    });
                  } catch (e) {
                    message.error((e as Error).message);
                    return;
                  }
                  message.success("修改成功");
                },
              });
            }}
          >
            应用设置
          </Button>
        </Space.Compact>
      </Row>
      <ManageProvider appId={appId}>
        {contextHolder}
        <ManageDashBoard />
      </ManageProvider>
    </Form>
  );
}

export const Route = createFileRoute("/apps/$id")({
  component: AppDetailComponent,
});
