import { List } from "antd";

export default ({ dataSource }: { dataSource: Package[] }) => (
  <List
    size="small"
    dataSource={dataSource}
    renderItem={(i) => (
      <List.Item style={{ padding: "8px 0" }}>
        <List.Item.Meta title={i.name} description={`编译时间 ${i.buildTime}`} />
      </List.Item>
    )}
  />
);
