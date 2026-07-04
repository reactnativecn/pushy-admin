import { Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

type SupportStatus = 'supported' | 'unsupported' | 'warning';
type SupportCell = { label: string; status: SupportStatus };
type PublishFeatureRow = {
  key: string;
  version: string;
  fullRelease: SupportCell;
  grayRelease: SupportCell;
  bothRelease: SupportCell;
};

const statusColorMap: Record<SupportStatus, string> = {
  supported: 'success',
  unsupported: 'error',
  warning: 'warning',
};

function renderSupportCell(cell: SupportCell) {
  return <Tag color={statusColorMap[cell.status]}>{cell.label}</Tag>;
}

/**
 * 发布功能支持情况表格组件
 * 展示不同 react-native-update 版本对各种发布功能的支持情况
 */
export default function PublishFeatureTable() {
  const { t } = useTranslation();

  return (
    <div className="w-[600px]">
      <Table
        size="small"
        pagination={false}
        dataSource={
          [
            {
              key: '1',
              version: '< v10.15.0',
              fullRelease: {
                label: t('publish_feature_table.supported'),
                status: 'supported',
              },
              grayRelease: {
                label: t('publish_feature_table.not_supported'),
                status: 'unsupported',
              },
              bothRelease: {
                label: t('publish_feature_table.gray_ignored'),
                status: 'warning',
              },
            },
            {
              key: '2',
              version: 'v10.15.0 - v10.31.3',
              fullRelease: {
                label: t('publish_feature_table.supported'),
                status: 'supported',
              },
              grayRelease: {
                label: t('publish_feature_table.supported'),
                status: 'supported',
              },
              bothRelease: {
                label: t('publish_feature_table.gray_ignored'),
                status: 'warning',
              },
            },
            {
              key: '3',
              version: '≥ v10.32.0',
              fullRelease: {
                label: t('publish_feature_table.supported'),
                status: 'supported',
              },
              grayRelease: {
                label: t('publish_feature_table.supported'),
                status: 'supported',
              },
              bothRelease: {
                label: t('publish_feature_table.both_supported'),
                status: 'supported',
              },
            },
          ] satisfies PublishFeatureRow[]
        }
        columns={[
          {
            title: (
              <span>
                {t('publish_feature_table.version_header_line1')}
                <br />
                {t('publish_feature_table.version_header_line2')}
              </span>
            ),
            dataIndex: 'version',
            key: 'version',
            width: 200,
          },
          {
            title: t('publish_feature_table.full_release_only'),
            dataIndex: 'fullRelease',
            key: 'fullRelease',
            align: 'center',
            render: renderSupportCell,
          },
          {
            title: t('publish_feature_table.gray_release_only'),
            dataIndex: 'grayRelease',
            key: 'grayRelease',
            align: 'center',
            render: renderSupportCell,
          },
          {
            title: t('publish_feature_table.both_release'),
            dataIndex: 'bothRelease',
            key: 'bothRelease',
            align: 'center',
            render: renderSupportCell,
          },
        ]}
      />
      <div className="mt-2">{t('publish_feature_table.note')}</div>
    </div>
  );
}
