import { List, Tag } from "antd";
import { useDrag } from "react-dnd";

export default ({ dataSource }: { dataSource: Package[] }) => (
  <List
    className="packages"
    size="small"
    dataSource={dataSource}
    renderItem={(item) => <Item item={item} />}
  />
);

const Item = ({ item }: { item: Package }) => {
  const [_, drag] = useDrag(() => ({ item, type: "package" }));
  return (
    <div ref={drag} style={{ margin: "0 -8px" }}>
      <List.Item style={{ padding: "8px" }}>
        <List.Item.Meta
          title={
            <>
              {item.name} <Tag style={{ marginLeft: 6 }}>{item.version.name}</Tag>
            </>
          }
          description={`编译时间：${item.buildTime}`}
        />
      </List.Item>
    </div>
  );
};
