import { Button, Descriptions, Space, Popover, Spin } from 'antd';
import { ReactNode, useState } from 'react';
import { AlipayCircleOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import dayjs from 'dayjs';
import request from '../services/request';
import { PRICING_LINK } from '../constants/links';
import { quotas } from '../constants/quotas';
import { useUserInfo } from '@/utils/hooks';

const InvoiceHint = (
  <div>
    <p>
      请发送邮件至 <a href='mailto:hi@charmlot.com'>hi@charmlot.com</a>
      ，并写明：
    </p>
    <p>
      <strong>
        公司名称、税号、注册邮箱、接收发票邮箱（不写则发送到注册邮箱），附带支付截图。
      </strong>
    </p>
    <p>我们默认会回复普通电子发票到接收邮箱(请同时留意垃圾邮件)，类目为软件服务。</p>
    <p>如需要邮寄纸质发票请注明邮寄地址，邮费为到付。</p>
  </div>
);

const PurchaseButton = ({ tier, children }: { tier: string; children: ReactNode }) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      // type='link'
      className='ml-6'
      icon={<AlipayCircleOutlined />}
      onClick={async () => {
        setLoading(true);
        await purchase(tier);
      }}
      loading={loading}
    >
      {loading ? '跳转至支付页面' : children}
    </Button>
  );
};

function UserPanel() {
  const { user } = useUserInfo();
  if (!user) {
    return (
      <div style={{ lineHeight: '100vh', textAlign: 'center' }}>
        <Spin size='large' />
      </div>
    );
  }
  const { name, email, tier, tierExpiresAt } = user;
  const currentQuota = quotas[tier as keyof typeof quotas];
  return (
    <div className='body'>
      <Descriptions title='账户信息' column={1} labelStyle={{ width: 134 }} bordered>
        <Descriptions.Item label='用户名'>{name}</Descriptions.Item>
        <Descriptions.Item label='邮箱'>{email}</Descriptions.Item>
        <Descriptions.Item label='服务版本'>
          <Space>
            {currentQuota.title}
            <span>
              {currentQuota.pv < quotas.standard.pv && (
                <PurchaseButton tier='standard'>升级标准版</PurchaseButton>
              )}
              {currentQuota.pv < quotas.premium.pv && (
                <PurchaseButton tier='premium'>升级高级版</PurchaseButton>
              )}
              {currentQuota.pv < quotas.pro.pv && (
                <PurchaseButton tier='pro'>升级专业版</PurchaseButton>
              )}
              {currentQuota.pv < quotas.vip1.pv && (
                <PurchaseButton tier='enterprise'>升级大客户VIP1版</PurchaseButton>
              )}
              {currentQuota.pv < quotas.vip2.pv && (
                <PurchaseButton tier='vip2'>升级大客户VIP2版</PurchaseButton>
              )}
              {currentQuota.pv < quotas.vip3.pv && (
                <PurchaseButton tier='vip3'>升级大客户VIP3版</PurchaseButton>
              )}
            </span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label='服务有效期至'>
          <Space>
            {tierExpiresAt ? (
              <div className='flex flex-col'>
                {dayjs(tierExpiresAt).format('YYYY年MM月DD日')}
                <br />
                <div>(剩余 {dayjs(tierExpiresAt).diff(dayjs(), 'day')} 天)</div>
              </div>
            ) : (
              '无'
            )}
            {tierExpiresAt && (
              <>
                <PurchaseButton tier={tier}>续费</PurchaseButton>
                <Popover content={InvoiceHint} trigger='click'>
                  <Button type='link'>申请发票</Button>
                </Popover>
              </>
            )}
          </Space>
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Button href={PRICING_LINK} target='_blank'>
        查看价格表
      </Button>

      <Button
        type='primary'
        className='ml-6'
        href='https://pushy.reactnative.cn/docs/faq.html#%E5%8F%AF%E4%BB%A5%E4%BD%BF%E7%94%A8%E9%93%B6%E8%A1%8C%E8%BD%AC%E8%B4%A6%E4%BB%98%E6%AC%BE%E5%90%97'
        target='_blank'
      >
        使用网银转账
      </Button>
    </div>
  );
}

async function purchase(tier?: string) {
  const { payUrl } = await request('post', '/orders', { tier });
  window.location.href = payUrl;
}

export const Component = observer(UserPanel);
