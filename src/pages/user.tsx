import { Button, Descriptions, Space } from "antd";
import { ReactNode, useState } from "react";
import request from "../request";
import store from "../store";

export default () => {
  const { name, email, tier, tierExpiresAt } = store.user!;
  return (
    <div className="body">
      <Descriptions title="账户信息" column={1} labelStyle={{ width: 134 }} bordered>
        <Descriptions.Item label="用户名">{name}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{email}</Descriptions.Item>
        <Descriptions.Item label="服务版本">
          <Space>
            {tiers[tier]}
            <span>
              {tier == "free" && <PurchaseButton tier="standard">升级标准版</PurchaseButton>}
              {(tier == "free" || tier == "standard") && (
                <PurchaseButton tier="premium">升级高级版</PurchaseButton>
              )}
              {tier != "pro" && <PurchaseButton tier="pro">升级专业版</PurchaseButton>}
            </span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="服务有效期至">
          <Space>
            {tierExpiresAt ? new Date(tierExpiresAt).toLocaleDateString() : "无"}
            {tierExpiresAt && <PurchaseButton tier={tier}>续费</PurchaseButton>}
          </Space>
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Button type="primary" href="https://pushy.reactnative.cn/pricing.html" target="_blank">
        查看价格表
      </Button>
    </div>
  );
};

const PurchaseButton = ({ tier, children }: { tier: string; children: ReactNode }) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="link"
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

async function purchase(tier?: string) {
  const { payUrl } = await request("post", "orders", { tier });
  location.href = payUrl;
}

const tiers = {
  free: "免费版",
  standard: "标准版",
  premium: "高级版",
  pro: "专业版",
};
