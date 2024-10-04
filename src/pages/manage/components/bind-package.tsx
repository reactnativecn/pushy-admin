import { LinkOutlined } from '@ant-design/icons';
import { Tooltip, Tag, Dropdown, Button } from 'antd';
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
  const bindedPackages = packages.map((i) => {
    const rolloutConfig = config?.rollout?.[i.name];
    const isFull = rolloutConfig === 100 || rolloutConfig === undefined;
    return (
      <Tooltip key={i.id} title={i.note}>
        <Tag color='blue' bordered={isFull}>
          {i.name} {isFull ? '' : `(${rolloutConfig}%)`}
        </Tag>
      </Tooltip>
    );
  });
  const availablePackages = allPackages.filter((i) => !packages.some((j) => i.id === j.id));
  if (availablePackages.length === 0) return bindedPackages;

  return (
    <>
      {bindedPackages}
      <Dropdown
        menu={{
          items: availablePackages.map((p) => ({
            key: p.id,
            label: p.name,
            onClick: () => api.updatePackage({ appId, packageId: p.id, params: { versionId } }),
            // children: [
            //   {
            //     key: 'full',
            //     label: '全量',
            //     onClick: () =>
            //       api.updateVersion({
            //         appId,
            //         versionId,
            //         params: { config: { rollout: { [p.name]: null } } },
            //       }),
            //   },
            //   {
            //     key: 'gray',
            //     label: '灰度',
            //     children: [1, 2, 5, 10, 20, 50].map((percentage) => ({
            //       key: `${percentage}`,
            //       label: `${percentage}%`,
            //       onClick: () =>
            //         api.updateVersion({
            //           appId,
            //           versionId,
            //           params: { config: { rollout: { [p.name]: percentage } } },
            //         }),
            //     })),
            //   },
            // ],
          })),
        }}
        className='ant-typography-edit'
        // getPopupContainer={() => document.querySelector(`[data-row-key="${id}"]`) ?? document.body}
      >
        <Button type='link' size='small' icon={<LinkOutlined />}>
          绑定
        </Button>
      </Dropdown>
    </>
  );
};

export default BindPackage;
