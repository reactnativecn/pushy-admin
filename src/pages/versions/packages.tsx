import { DeleteFilled } from "@ant-design/icons";
import { Button, List, Modal, Popover, Tag } from "antd";
import { useDrag } from "react-dnd";
import request from "../../request";
import state, { fetchPackages, fetchVersions } from "./state";

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
  const remove = () => {
    Modal.confirm({
      title: `删除后无法恢复，确定删除原生包“${item.name}”？`,
      maskClosable: true,
      okButtonProps: { danger: true },
      async onOk() {
        await request("delete", `app/${state.app?.id}/package/${item.id}`);
        fetchPackages();
        fetchVersions(1);
      },
    });
  };
  const content = (
    <Button type="link" size="large" icon={<DeleteFilled />} onClick={remove} danger />
  );
  return (
    <div ref={drag} style={{ margin: "0 -8px", background: "#fff" }}>
      <Popover overlayClassName="popover-package" content={content} placement="right">
        <List.Item style={{ padding: "8px" }}>
          <List.Item.Meta
            title={
              <>
                {item.name}
                {item.version && <Tag style={{ marginLeft: 8 }}>{item.version.name}</Tag>}
              </>
            }
            description={`编译时间：${item.buildTime}`}
          />
        </List.Item>
      </Popover>
    </div>
  );
};
