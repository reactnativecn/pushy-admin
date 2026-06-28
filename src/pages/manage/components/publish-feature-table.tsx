import { Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

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
        dataSource={[
          {
            key: '1',
            version: '< v10.15.0',
            fullRelease: t('publish_feature_table.supported'),
            grayRelease: t('publish_feature_table.not_supported'),
            bothRelease: t('publish_feature_table.gray_ignored'),
          },
          {
            key: '2',
            version: 'v10.15.0 - v10.31.3',
            fullRelease: t('publish_feature_table.supported'),
            grayRelease: t('publish_feature_table.supported'),
            bothRelease: t('publish_feature_table.gray_ignored'),
          },
          {
            key: '3',
            version: '≥ v10.32.0',
            fullRelease: t('publish_feature_table.supported'),
            grayRelease: t('publish_feature_table.supported'),
            bothRelease: t('publish_feature_table.both_supported'),
          },
        ]}
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
            render: (text: string) => {
              return (
                <Tag color={text.includes('✓') ? 'success' : 'error'}>
                  {text}
                </Tag>
              );
            },
          },
          {
            title: t('publish_feature_table.gray_release_only'),
            dataIndex: 'grayRelease',
            key: 'grayRelease',
            align: 'center',
            render: (text: string) => {
              return (
                <Tag color={text.includes('✓') ? 'success' : 'error'}>
                  {text}
                </Tag>
              );
            },
          },
          {
            title: t('publish_feature_table.both_release'),
            dataIndex: 'bothRelease',
            key: 'bothRelease',
            align: 'center',
            render: (text: string) => {
              const color = text.includes('✓')
                ? 'success'
                : text.includes('⚠')
                  ? 'warning'
                  : 'error';
              return <Tag color={color}>{text}</Tag>;
            },
          },
        ]}
      />
      <div className="mt-2">{t('publish_feature_table.note')}</div>
    </div>
  );
}
