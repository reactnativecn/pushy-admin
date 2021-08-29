import { Button, Input, Modal, Table, Tag, Typography } from "antd";
import { ColumnType } from "antd/lib/table";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useDrag, useDrop } from "react-dnd";
import request from "../../request";
import state, { fetchPackages, fetchVersions, removeSelectedVersions } from "./state";

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
    title: "绑定原生包",
    dataIndex: "packages",
    width: "100%",
    render: (_, { packages }) => packages.map((i) => <PackageItem key={i.id} item={i} />),
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
          await request("put", `app/${state.app?.id}/version/${record.id}`, { [key]: value });
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
  const { versions, pagination, loading, selected } = state;

  return (
    <Table
      className="versions"
      rowKey="id"
      title={() => "热更新包"}
      columns={columns}
      components={{ body: { row: TableRow } }}
      dataSource={versions}
      pagination={pagination}
      rowSelection={{
        selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
        onChange: (keys) =>
          runInAction(() => (state.selected = observable.array(keys as number[]))),
      }}
      loading={loading}
      footer={
        selected.length
          ? () => (
              <Button onClick={removeSelectedVersions} danger>
                删除
              </Button>
            )
          : undefined
      }
    />
  );
});

const TableRow = (props: any) => {
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: "package",
    async drop(i: PackageBase) {
      const { id, packages = [] } = state.versions.find((i) => i.id == props["data-row-key"]) ?? {};
      if (packages.find(({ id }) => i.id == id)) return;
      await request("put", `app/${state.app?.id}/package/${i.id}`, { versionId: id });
      fetchPackages();
      fetchVersions(state.pagination.current);
    },
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
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
