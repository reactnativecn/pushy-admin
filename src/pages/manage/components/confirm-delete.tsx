import { Modal, Typography } from 'antd';
import type { ReactNode } from 'react';

const NameList = ({ names }: { names: { id: number; name: string }[] }) => (
  <div className="max-h-48 overflow-y-auto">
    {names.map((item) => (
      <div key={item.id}>{item.name}</div>
    ))}
  </div>
);

/**
 * 版本、原生包的删除确认弹窗共用：危险按钮、点遮罩/Esc 可关闭。
 * names 传字符串时原样展示（单条），传列表时渲染成可滚动的名单（批量）；
 * warning 以红色段落展示在名单上方。
 */
export function confirmDelete({
  title,
  names,
  warning,
  onOk,
}: {
  title: ReactNode;
  names?: string | { id: number; name: string }[];
  warning?: ReactNode;
  onOk: () => Promise<unknown>;
}) {
  const warningNode = warning ? (
    <Typography.Paragraph type="danger">{warning}</Typography.Paragraph>
  ) : null;
  const namesNode = Array.isArray(names) ? <NameList names={names} /> : names;
  const content =
    warningNode && namesNode ? (
      <div>
        {warningNode}
        {namesNode}
      </div>
    ) : (
      (warningNode ?? namesNode)
    );

  Modal.confirm({
    title,
    content,
    maskClosable: true,
    keyboard: true,
    okButtonProps: { danger: true },
    async onOk() {
      await onOk();
    },
  });
}
