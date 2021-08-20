import { Input, Modal, Table, Tag, Typography } from "antd";
import { ColumnType } from "antd/lib/table";
import { observer } from "mobx-react-lite";
import { useDrop, useDrag } from "react-dnd";
import request from "../../request";
import state, { fetchVersions, fetchPackages } from "./state";

const columns: ColumnType<Version>[] = [
  { title: "版本", dataIndex: "name", render: (_, record) => renderCol(record, "name") },
  {
    title: "描述",
    dataIndex: "description",
    render: (_, record) => renderCol(record, "description"),
  },
  {
    title: "元信息",
    dataIndex: "metaInfo",
    render: (_, record) => renderCol(record, "metaInfo"),
  },
  {
    title: "原生包",
    dataIndex: "packages",
    width: "100%",
    render: (_, { packages }) => packages.map((i) => <PackageItem item={i} />),
  },
];

function renderCol(record: Version, key: string) {
  let value = Reflect.get(record, key);
  const editable = {
    editing: false,
    onStart() {
      Modal.confirm({
        icon: null,
        title: columns.find((i) => i.dataIndex == key)?.title,
        closable: true,
        maskClosable: true,
        content: (
          <Input.TextArea defaultValue={value} onChange={({ target }) => (value = target.value)} />
        ),
        async onOk() {
          await request("put", `app/${state.id}/version/${record.id}`, { [key]: value });
          fetchVersions(state.pagination.current);
        },
      });
    },
  };
  return (
    <Typography.Text style={{ width: 160 }} editable={editable} ellipsis>
      {value}
    </Typography.Text>
  );
}

export default observer(() => {
  const { versions, pagination, loading: tableLoading } = state;

  return (
    <Table
      className="versions"
      rowKey="id"
      title={() => "热更新包"}
      columns={columns}
      components={{ body: { row: TableRow } }}
      dataSource={versions}
      pagination={pagination}
      loading={tableLoading}
    />
  );
});

const TableRow = (props: any) => {
  const { id, packages = [] } = state.versions.find((i) => i.id == props["data-row-key"]) ?? {};
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: "package",
    async drop(i: PackageBase) {
      if (packages.find(({ id }) => i.id == id)) return;
      await request("put", `app/${state.id}/package/${i.id}`, { versionId: id });
      fetchPackages();
      fetchVersions(state.pagination.current);
    },
    collect: (monitor) => {
      const i = monitor.getItem<PackageBase>();
      const includes = i ? packages.find(({ id }) => i.id == id) : false;
      return { isOver: !includes && monitor.isOver(), canDrop: !includes && monitor.canDrop() };
    },
  }));
  let className = "";
  if (canDrop) className = "can-drop";
  if (isOver) className = "is-over";
  return <tr ref={drop} {...props} className={`ant-table-row ${className}`} />;
};

const PackageItem = ({ item }: { item: PackageBase }) => {
  const [_, drag] = useDrag(() => ({ item, type: "package" }));
  return (
    <Tag ref={drag} color="#1890ff" draggable>
      {item.name}
    </Tag>
  );
};
