import { LinkOutlined } from '@ant-design/icons';
import { Tooltip, Tag, Dropdown, Button } from 'antd';
import { useManageContext } from '../hooks/useManageContext';
import { api } from '@/services/api';

const PackageItem = ({ item }: { item: PackageBase }) => (
  // const [_, drag] = useDrag(() => ({ item, type: "package" }));
  <Tooltip title={item.note}>
    <Tag color='#1890ff'>{item.name}</Tag>
  </Tooltip>
);

const BindPackage = ({ packages, versionId }: { packages: PackageBase[]; versionId: number }) => {
  const { packages: allPackages, appId } = useManageContext();
  const bindedPackages = packages.map((i) => <PackageItem key={i.id} item={i} />);
  const availablePackages = allPackages.filter((i) => !packages.some((j) => i.id === j.id));
  if (availablePackages.length === 0) return bindedPackages;

  return (
    <>
      {bindedPackages}
      <Dropdown
        menu={{
          items: availablePackages.map((i) => ({
            key: i.id,
            label: i.name,
            children: [
              {
                key: 'full',
                label: '全量',
                onClick: () => api.updatePackage({ appId, packageId: i.id, params: { versionId } }),
              },
              {
                key: 'diff',
                label: '灰度',
                onClick: () => {
                  // api.updateVersion({
                  //   versionId,
                  //   appId,
                  //   params: { config: { rollout: { [i.version.name]: 100 } } },
                  // });
                  // api.updatePackage({ appId, packageId: i.id, params: { versionId } });
                },
              },
            ],
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
