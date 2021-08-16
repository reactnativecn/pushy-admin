import { Breadcrumb, Layout, Tabs, Empty, Spin } from "antd";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import PackageList from "./packages";
import state, { init } from "./state";

export default observer(() => {
  const id = Reflect.get(useParams(), "id");
  useEffect(() => init(id), []);
  const { loading, app, packages, unused } = state;
  return (
    <Spin spinning={loading}>
      <Breadcrumb>
        <Breadcrumb.Item>
          <Link to="/apps">应用列表</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{app?.name}</Breadcrumb.Item>
      </Breadcrumb>
      <br />
      <Layout>
        <Layout.Sider theme="light" style={style.sider} width={240}>
          <Tabs>
            <Tabs.TabPane tab="全部" key="all">
              <PackageList dataSource={packages} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="未使用" key="unused">
              <PackageList dataSource={unused} />
            </Tabs.TabPane>
          </Tabs>
        </Layout.Sider>
        <Layout.Content className="body">
          <Empty />
        </Layout.Content>
      </Layout>
    </Spin>
  );
});

const style: Style = {
  sider: { marginRight: 16, padding: 16, paddingTop: 0 },
};
