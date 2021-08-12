import { Button, Descriptions, Space } from "antd";
import { observable } from "mobx";
import { observer } from "mobx-react-lite";
import request from "../request";
import store from "../store";

const state = observable.object({ loading: false });

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
            {tier == "free" && (
              <Button type="link" onClick={() => purchase("standard")}>
                升级标准版
              </Button>
            )}
            {(tier == "free" || tier == "standard") && (
              <Button type="link" onClick={() => purchase("permium")}>
                升级高级版
              </Button>
            )}
            {tier != "pro" && (
              <Button type="link" onClick={() => purchase("pro")}>
                升级专业版
              </Button>
            )}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="服务有效期至">
          <Space>
            {tierExpiresAt ? new Date(tierExpiresAt).toLocaleDateString() : "无"}
            <PurchaseButton />
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

const PurchaseButton = observer(() => {
  const { tierExpiresAt, tier } = store.user!;
  if (!tierExpiresAt) return <></>;

  const { loading } = state;
  return (
    <Button type="link" onClick={() => purchase(tier)} loading={loading}>
      {loading ? "正在跳转到购买页面" : "续费"}
    </Button>
  );
});

async function purchase(tier?: string) {
  const { payUrl } = await request("post", "orders", { tier });
  location.href = payUrl;
  state.loading = true;
}

const tiers = {
  free: "免费版",
  standard: "标准版",
  premium: "高级版",
  pro: "专业版",
};
