import { PRICING_LINK } from "@/constants/links";
import { quotas } from "@/constants/quotas";
import { rootRouterPath } from "@/router";
import { api } from "@/services/api";
import { useAppList, useUserInfo } from "@/utils/hooks";
import {
  AppstoreOutlined,
  PlusOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Card,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Progress,
  Select,
  Tag,
  Tooltip,
  message,
} from "antd";
import { Link, useLocation } from "react-router-dom";
import { ReactComponent as LogoH } from "../assets/logo-h.svg";
import PlatformIcon from "./platform-icon";

interface SiderMenuProps {
  selectedKeys: string[];
}

interface Style {
  sider: React.CSSProperties;
}

function addApp() {
  let name = "";
  let platform = "android";
  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form initialValues={{ platform }}>
        <br />
        <Form.Item label="应用名称" name="name">
          <Input
            placeholder="请输入应用名称"
            onChange={({ target }) => (name = target.value)}
          />
        </Form.Item>
        <Form.Item label="选择平台" name="platform">
          <Select
            onSelect={(value: string) => {
              platform = value;
            }}
            options={[
              {
                value: "android",
                label: (
                  <>
                    <PlatformIcon platform="android" className="mr-2" /> Android
                  </>
                ),
              },
              {
                value: "ios",
                label: (
                  <>
                    <PlatformIcon platform="ios" className="mr-2" /> iOS
                  </>
                ),
              },
              {
                value: "harmony",
                label: (
                  <>
                    <PlatformIcon platform="harmony" className="mr-[10px]" />
                    HarmonyOS
                  </>
                ),
              },
            ]}
          />
        </Form.Item>
      </Form>
    ),
    onOk() {
      if (!name) {
        message.warning("请输入应用名称");
        return false;
      }
      return api.createApp({ name, platform }).catch((error) => {
        message.error((error as Error).message);
      });
    },
  });
}

export default function Sider() {
  const { pathname } = useLocation();
  const { user } = useUserInfo();
  if (!user) return null;

  const initPath = pathname?.replace(/^\//, "")?.split("/");
  let selectedKeys = initPath;
  if (selectedKeys?.length === 0) {
    if (pathname === "/") {
      selectedKeys = ["/user"];
    } else {
      selectedKeys = initPath;
    }
  }
  return (
    <Layout.Sider width={240} theme="light" style={style.sider}>
      <Layout.Header className="flex justify-center items-center bg-transparent px-0">
        <LogoH />
      </Layout.Header>
      <SiderMenu selectedKeys={selectedKeys} />
    </Layout.Sider>
  );
}

const SiderMenu = ({ selectedKeys }: SiderMenuProps) => {
  const { user, displayExpireDay, displayRemainingDays } = useUserInfo();
  const { apps } = useAppList();
  const quota = quotas[user?.tier as keyof typeof quotas];
  const pvQuota = quota?.pv;
  const consumedQuota = user?.checkQuota;
  const percent =
    pvQuota && consumedQuota ? (consumedQuota / pvQuota) * 100 : undefined;
  return (
    <div>
      {percent && (
        <Card
          title={
            <div className="text-center py-1">
              <span className="">{user?.email}</span>
              <br />
              <span className="font-normal">今日剩余总查询热更次数</span>
            </div>
          }
          size="small"
          className="mr-2 mb-4"
        >
          <Progress
            status={percent && percent > 40 ? "normal" : "exception"}
            size={["100%", 30]}
            percent={percent}
            percentPosition={{ type: "inner", align: "center" }}
            format={() =>
              consumedQuota ? `${consumedQuota.toLocaleString()} 次` : ""
            }
          />
          <div className="text-xs mt-2 text-center">
            7日平均剩余次数：{user?.last7dAvg?.toLocaleString()} 次
          </div>
          <div className="text-xs mt-2 text-center">
            <a target="_blank" href={PRICING_LINK} rel="noreferrer">
              {quota?.title}
            </a>
            可用: {pvQuota?.toLocaleString()} 次/每日
          </div>{" "}
          {user?.tier !== "free" && (
            <div className="text-xs mt-2 text-center">
              有效期至：{displayExpireDay}
              {displayRemainingDays && (
                <>
                  <br />
                  <div>{displayRemainingDays}</div>
                </>
              )}
            </div>
          )}
        </Card>
      )}
      <Menu
        defaultOpenKeys={["apps"]}
        selectedKeys={selectedKeys}
        mode="inline"
        items={[
          {
            key: "user",
            icon: <UserOutlined />,
            label: <Link to={rootRouterPath.user}>账户设置</Link>,
          },
          {
            key: "apps",
            icon: <AppstoreOutlined />,
            label: "应用管理",
            children: [
              ...(apps?.map((i) => ({
                key: i.id,
                className: "!h-16",
                label: (
                  <div className="flex flex-row items-center gap-4">
                    <div className="flex flex-col justify-center">
                      <PlatformIcon
                        platform={i.platform}
                        className="!text-xl"
                      />
                    </div>
                    <Link
                      to={`/apps/${i.id}`}
                      className="flex flex-col h-16 justify-center"
                    >
                      <div className="flex flex-row items-center font-bold">
                        {i.name}
                        {i.status === "paused" && (
                          <Tag className="ml-2">暂停</Tag>
                        )}
                      </div>
                      {i.checkCount && (
                        <div className="text-xs text-gray-500 mb-2">
                          <Tooltip
                            mouseEnterDelay={1}
                            title="今日此应用查询热更的次数"
                          >
                            <a>{i.checkCount.toLocaleString()} 次</a>
                          </Tooltip>
                        </div>
                      )}
                    </Link>
                  </div>
                ),
              })) || []),
              {
                key: "add-app",
                icon: <PlusOutlined />,
                label: "添加应用",
                onClick: addApp,
              },
            ],
          },
        ]}
      />
    </div>
  );
};

const style: Style = {
  sider: { boxShadow: "2px 0 8px 0 rgb(29 35 41 / 5%)", zIndex: 2 },
};
