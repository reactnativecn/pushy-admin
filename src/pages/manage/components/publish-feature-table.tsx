import { Table, Tag } from 'antd';

/**
 * 发布功能支持情况表格组件
 * 展示不同 react-native-update 版本对各种发布功能的支持情况
 */
export default function PublishFeatureTable() {
  return (
    <div className="w-[600px]">
      <Table
        size="small"
        pagination={false}
        dataSource={[
          {
            key: '1',
            version: '< v10.15.0',
            fullRelease: '✓ 支持',
            grayRelease: '✗ 不支持',
            bothRelease: '⚠ 灰度被忽略',
          },
          {
            key: '2',
            version: 'v10.15.0 - v10.31.3',
            fullRelease: '✓ 支持',
            grayRelease: '✓ 支持',
            bothRelease: '⚠ 灰度被忽略',
          },
          {
            key: '3',
            version: '≥ v10.32.0',
            fullRelease: '✓ 支持',
            grayRelease: '✓ 支持',
            bothRelease: '✓ 支持',
          },
        ]}
        columns={[
          {
            title: (
              <span>
                react-native-update 版本
                <br />
                (用户端)
              </span>
            ),
            dataIndex: 'version',
            key: 'version',
            width: 200,
          },
          {
            title: '仅全量发布',
            dataIndex: 'fullRelease',
            key: 'fullRelease',
            align: 'center',
            render: (text: string) => {
              if (text.includes('✓')) {
                return <Tag color="success">✓ 支持</Tag>;
              }
              return <Tag color="error">✗ 不支持</Tag>;
            },
          },
          {
            title: '仅灰度发布',
            dataIndex: 'grayRelease',
            key: 'grayRelease',
            align: 'center',
            render: (text: string) => {
              if (text.includes('✓')) {
                return <Tag color="success">✓ 支持</Tag>;
              }
              return <Tag color="error">✗ 不支持</Tag>;
            },
          },
          {
            title: '同时发布',
            dataIndex: 'bothRelease',
            key: 'bothRelease',
            align: 'center',
            render: (text: string) => {
              if (text.includes('✓')) {
                return <Tag color="success">✓ 支持</Tag>;
              }
              if (text.includes('⚠')) {
                return <Tag color="warning">⚠ 灰度被忽略</Tag>;
              }
              return <Tag color="error">✗ 不支持</Tag>;
            },
          },
        ]}
      />
      <div className="mt-2">注：取消发布不会导致已更新的用户回滚。</div>
    </div>
  );
}
