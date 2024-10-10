import { LinkOutlined } from '@ant-design/icons';
import { Dropdown, Button, MenuProps } from 'antd';
import { useManageContext } from '../hooks/useManageContext';
import { api } from '@/services/api';

const BindPackage = ({
  packages,
  versionId,
  config,
}: {
  packages: PackageBase[];
  versionId: number;
  config: Version['config'];
}) => {
  const { packages: allPackages, appId } = useManageContext();
  const availablePackages = allPackages.filter((i) => !packages.some((j) => i.id === j.id));

  const bindedPackages = packages.map((p) => {
    const rolloutConfig = config?.rollout?.[p.name];
    const isFull = rolloutConfig === 100 || rolloutConfig === undefined || rolloutConfig === null;
    const rolloutConfigNumber = Number(rolloutConfig);
    const menu: MenuProps = {
      onClick: () => api.updatePackage({ appId, packageId: p.id, params: { versionId } }),
      items: [
        {
          key: 'full',
          label: '全量',
          onClick: () =>
            api.updateVersion({
              appId,
              versionId,
              params: { config: { rollout: { [p.name]: null } } },
            }),
        },
      ],
    };

    if (rolloutConfigNumber < 50) {
      menu.items?.push({
        key: 'gray',
        label: '灰度',
        children: [1, 2, 5, 10, 20, 50]
          .filter((percentage) => percentage > rolloutConfigNumber)
          .map((percentage) => ({
            key: `${percentage}`,
            label: `${percentage}%`,
            onClick: () =>
              api.updateVersion({
                appId,
                versionId,
                params: { config: { rollout: { [p.name]: percentage } } },
              }),
          })),
      });
    }
    const button = (
      <Button size='small' color='primary' variant={isFull ? 'filled' : 'dashed'}>
        <span className='font-bold'>{p.name}</span>
        <span className='text-xs'>{isFull ? '' : `(${rolloutConfig}%)`}</span>
      </Button>
    );
    return isFull ? (
      <div key={p.id}>{button}</div>
    ) : (
      <Dropdown key={p.id} menu={menu}>
        {button}
      </Dropdown>
    );
  });

  return (
    <div className='flex flex-wrap gap-1'>
      {bindedPackages}
      {availablePackages.length !== 0 && (
        <Dropdown
          menu={{
            items: availablePackages.map((p) => ({
              key: p.id,
              label: p.name,
              onClick: () => api.updatePackage({ appId, packageId: p.id, params: { versionId } }),
              children: [
                {
                  key: 'full',
                  label: '全量',
                  onClick: () =>
                    api.updateVersion({
                      appId,
                      versionId,
                      params: { config: { rollout: { [p.name]: null } } },
                    }),
                },
                {
                  key: 'gray',
                  label: '灰度',
                  children: [1, 2, 5, 10, 20, 50].map((percentage) => ({
                    key: `${percentage}`,
                    label: `${percentage}%`,
                    onClick: () =>
                      api.updateVersion({
                        appId,
                        versionId,
                        params: { config: { rollout: { [p.name]: percentage } } },
                      }),
                  })),
                },
              ],
            })),
          }}
          className='ant-typography-edit'
        >
          <Button type='link' size='small' icon={<LinkOutlined />}>
            绑定
          </Button>
        </Dropdown>
      )}
    </div>
  );
};

export default BindPackage;
