import { List, Tag } from "antd";

export default ({ dataSource }: { dataSource: Package[] }) => (
  <List
    className="packages"
    size="small"
    dataSource={dataSource}
    renderItem={(i) => (
      <List.Item style={{ padding: "8px 0" }} draggable>
        <List.Item.Meta
          title={
            <>
              {i.name} <Tag style={{ marginLeft: 6 }}>{i.version.name}</Tag>
            </>
          }
          description={`编译时间：${i.buildTime}`}
        />
      </List.Item>
    )}
  />
);
