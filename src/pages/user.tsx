import { AlipayCircleOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Descriptions, Dropdown, Popover, Space, Spin } from "antd";
import { type ReactNode, useState } from "react";
import { api } from "@/services/api";
import { useUserInfo } from "@/utils/hooks";
import { PRICING_LINK } from "../constants/links";
import { quotas } from "../constants/quotas";

const InvoiceHint = (
  <div>
    <p>
      请发送邮件至 <a href="mailto:hi@charmlot.com">hi@charmlot.com</a>
      ，并写明：
    </p>
    <p>
      <strong>
        公司名称、税号、注册邮箱、接收发票邮箱（不写则发送到注册邮箱），附带支付截图。
      </strong>
    </p>
    <p>
      我们默认会回复普通电子发票到接收邮箱(请同时留意垃圾邮件)，类目为软件服务。
    </p>
  </div>
);

const PurchaseButton = ({
  tier,
  children,
}: {
  tier: string;
  children: ReactNode;
}) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      // type='link'
      className="ml-6"
      icon={<AlipayCircleOutlined />}
      onClick={async () => {
        setLoading(true);
        await purchase(tier);
      }}
      loading={loading}
    >
      {loading ? "跳转至支付页面" : children}
    </Button>
  );
};

const UpgradeDropdown = ({
  currentQuota,
}: {
  currentQuota: (typeof quotas)[keyof typeof quotas];
}) => {
  const [loading, setLoading] = useState(false);

  // 获取所有可升级的版本
  const getUpgradeOptions = () => {
    const allTiers = [
      { key: "standard", title: "升级标准版", tier: "standard" },
      { key: "premium", title: "升级高级版", tier: "premium" },
      { key: "pro", title: "升级专业版", tier: "pro" },
      { key: "vip1", title: "升级大客户VIP1版", tier: "vip1" },
      { key: "vip2", title: "升级大客户VIP2版", tier: "vip2" },
      { key: "vip3", title: "升级大客户VIP3版", tier: "vip3" },
    ];

    return allTiers.filter(
      (option) =>
        currentQuota.pv < quotas[option.tier as keyof typeof quotas].pv
    );
  };

  const upgradeOptions = getUpgradeOptions();

  if (upgradeOptions.length === 0) {
    return null; // 没有可升级的版本
  }

  const handleMenuClick: MenuProps["onClick"] = async ({ key }) => {
    setLoading(true);
    await purchase(key);
  };

  const menuItems: MenuProps["items"] = upgradeOptions.map((option) => ({
    key: option.tier,
    label: option.title,
    icon: <AlipayCircleOutlined />,
  }));

  const handleMainButtonClick = async () => {
    // 点击主按钮时，选择第一个可升级的版本
    if (upgradeOptions.length > 0) {
      setLoading(true);
      await purchase(upgradeOptions[0].tier);
    }
  };

  return (
    <Dropdown.Button
      className="ml-6"
      icon={<AlipayCircleOutlined />}
      loading={loading}
      menu={{
        items: menuItems,
        onClick: handleMenuClick,
      }}
      onClick={handleMainButtonClick}
    >
      {loading ? "跳转至支付页面" : upgradeOptions[0]?.title || "升级服务"}
    </Dropdown.Button>
  );
};

function UserPanel() {
  const { user, displayExpireDay, displayRemainingDays } = useUserInfo();
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  const { name, email, tier } = user;
  const currentQuota = quotas[tier as keyof typeof quotas];
  return (
    <div className="body">
      <Descriptions
        title="账户信息"
        column={1}
        styles={{ label: { width: 134 } }}
        bordered
      >
        <Descriptions.Item label="用户名">{name}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{email}</Descriptions.Item>
        <Descriptions.Item label="服务版本">
          <Space>
            {currentQuota.title}
            <UpgradeDropdown currentQuota={currentQuota} />
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="服务有效期至">
          <Space>
            {displayExpireDay ? (
              <div className="flex flex-col">
                {displayExpireDay}
                {displayRemainingDays && (
                  <>
                    <br />
                    <div>{displayRemainingDays}</div>
                  </>
                )}
              </div>
            ) : (
              "无"
            )}
            {tier !== "free" && (
              <>
                <PurchaseButton tier={tier}>续费</PurchaseButton>
                <Popover content={InvoiceHint} trigger="click">
                  <Button type="link">申请发票</Button>
                </Popover>
              </>
            )}
          </Space>
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Button href={PRICING_LINK} target="_blank">
        查看价格表
      </Button>

      <Button
        type="primary"
        className="ml-6"
        href="https://pushy.reactnative.cn/docs/faq.html#%E5%8F%AF%E4%BB%A5%E4%BD%BF%E7%94%A8%E9%93%B6%E8%A1%8C%E8%BD%AC%E8%B4%A6%E4%BB%98%E6%AC%BE%E5%90%97"
        target="_blank"
      >
        使用网银转账
      </Button>
    </div>
  );
}

async function purchase(tier?: string) {
  const orderResponse = await api.createOrder({ tier });
  if (orderResponse?.payUrl) {
    window.location.href = orderResponse.payUrl;
  }
}

export const Component = UserPanel;
