import {
  AndroidFilled,
  AppleFilled,
  AppstoreOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Card,
  Layout,
  Menu,
  Progress,
  Tag,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  message,
} from 'antd';
import { Link, useLocation } from 'react-router-dom';

import dayjs from 'dayjs';
import { quotas } from '@/constants/quotas';
import { PRICING_LINK } from '@/constants/links';
import { rootRouterPath } from '@/router';
import { useAppList, useUserInfo } from '@/utils/hooks';
import { api } from '@/services/api';

function addApp() {
  let name = '';
  let platform = 'android';
  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form initialValues={{ platform }}>
        <br />
        <Form.Item label='应用名称' name='name'>
          <Input placeholder='请输入应用名称' onChange={({ target }) => (name = target.value)} />
        </Form.Item>
        <Form.Item label='选择平台' name='platform'>
          <Select
            onSelect={(value: string) => {
              platform = value;
            }}
          >
            <Select.Option value='android'>
              <AndroidFilled style={{ color: '#3ddc84' }} /> Android
            </Select.Option>
            <Select.Option value='ios'>
              <AppleFilled style={{ color: '#a6b1b7' }} /> iOS
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    ),
    onOk() {
      if (!name) {
        message.warning('请输入应用名称');
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

  const initPath = pathname?.replace(/^\//, '')?.split('/');
  let selectedKeys = initPath;
  if (selectedKeys?.length === 0) {
    if (pathname === '/') {
      selectedKeys = ['/user'];
    } else {
      selectedKeys = initPath;
    }
  }
  return (
    <Layout.Sider width={240} theme='light' style={style.sider}>
      <Layout.Header style={style.logo}>Pushy</Layout.Header>
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
  const percent = pvQuota && consumedQuota ? (consumedQuota / pvQuota) * 100 : undefined;
  return (
    <div>
      {percent && (
        <Card
          title={
            <div className='text-center py-1'>
              <span className=''>{user?.email}</span>
              <br />
              <span className='font-normal'>今日剩余总查询热更次数</span>
            </div>
          }
          size='small'
          className='mr-2 mb-4'
        >
          <Progress
            status={percent && percent > 40 ? 'normal' : 'exception'}
            size={['100%', 30]}
            percent={percent}
            percentPosition={{ type: 'inner', align: 'center' }}
            format={() => (consumedQuota ? `${consumedQuota.toLocaleString()} 次` : '')}
          />
          <div className='text-xs mt-2 text-center'>
            7日平均剩余次数：{user?.last7dAvg?.toLocaleString()} 次
          </div>
          <div className='text-xs mt-2 text-center'>
            <a target='_blank' href={PRICING_LINK} rel='noreferrer'>
              {quota?.title}
            </a>
            可用: {pvQuota?.toLocaleString()} 次/每日
          </div>{' '}
          {user?.tier !== 'free' && (
            <div className='text-xs mt-2 text-center'>
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
      <Menu defaultOpenKeys={['apps']} selectedKeys={selectedKeys} mode='inline'>
        <Menu.Item key='user' icon={<UserOutlined />}>
          <Link to={rootRouterPath.user}>账户设置</Link>
        </Menu.Item>
        <Menu.SubMenu key='apps' title='应用管理' icon={<AppstoreOutlined />}>
          {apps?.map((i) => (
            <Menu.Item key={i.id} className='!h-16'>
              <div className='flex flex-row items-center gap-4'>
                <div className='flex flex-col justify-center'>
                  {i.platform === 'ios' ? (
                    <AppleFilled style={style.ios} className='!text-xl' />
                  ) : (
                    <AndroidFilled style={style.android} className='!text-xl' />
                  )}
                </div>
                <Link to={`/apps/${i.id}`} className='flex flex-col h-16 justify-center'>
                  <div className='flex flex-row items-center font-bold'>
                    {i.name}
                    {i.status === 'paused' && <Tag className='ml-2'>暂停</Tag>}
                  </div>
                  {i.checkCount && (
                    <div className='text-xs text-gray-500 mb-2'>
                      <Tooltip mouseEnterDelay={1} title='今日此应用查询热更的次数'>
                        <a>{i.checkCount.toLocaleString()} 次</a>
                      </Tooltip>
                    </div>
                  )}
                </Link>
              </div>
            </Menu.Item>
          ))}
          <Menu.Item key='add-app' icon={<PlusOutlined />} onClick={addApp}>
            添加应用
          </Menu.Item>
        </Menu.SubMenu>
      </Menu>
    </div>
  );
};

const style: Style = {
  sider: { boxShadow: '2px 0 8px 0 rgb(29 35 41 / 5%)', zIndex: 2 },
  logo: {
    background: '#fff',
    color: '#1890ff',
    fontSize: 22,
    fontWeight: 600,
  },
  ios: { color: '#a6b1b7' },
  android: { color: '#3ddc84' },
};
