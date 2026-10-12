import { EditOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Popover, Spin, Typography } from 'antd';
import { lazy, type ReactNode, Suspense, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextContent } from 'vanilla-jsoneditor';
import { useUpdateVersion } from '@/services/mutations';
import type { Version } from '@/types';
import { formatDateTime } from '@/utils/format';
import { useManageContext } from '../hooks/useManageContext';

const JsonEditor = lazy(() => import('./json-editor'));

type EditableVersionKey = 'name' | 'description' | 'metaInfo' | 'createdAt';

export const EditFieldModal = ({
  title,
  isJson,
  initialValue,
  saving,
  onSubmit,
  onClose,
}: {
  title: ReactNode;
  isJson: boolean;
  initialValue: string;
  saving: boolean;
  onSubmit: (value: string) => Promise<unknown>;
  onClose: () => void;
}) => {
  const [textValue, setTextValue] = useState(initialValue);
  // vanilla-jsoneditor replays the `content` prop on every re-render, so the
  // JSON draft lives in a ref to keep the editor uncontrolled while typing.
  const jsonDraftRef = useRef(initialValue);
  const [initialContent] = useState(() => ({ text: initialValue }));

  return (
    <Modal
      open
      title={title}
      width={isJson ? 640 : undefined}
      maskClosable
      confirmLoading={saving}
      onCancel={onClose}
      onOk={async () => {
        try {
          await onSubmit(isJson ? jsonDraftRef.current : textValue);
        } catch {
          // request layer already toasts the error; keep the modal open
          return;
        }
        onClose();
      }}
    >
      {isJson ? (
        <Suspense
          fallback={
            <div className="flex h-96 items-center justify-center">
              <Spin />
            </div>
          }
        >
          <JsonEditor
            className="h-96"
            content={initialContent}
            onChange={(content) => {
              jsonDraftRef.current = (content as TextContent).text;
            }}
          />
        </Suspense>
      ) : (
        <Input.TextArea
          value={textValue}
          onChange={({ target }) => setTextValue(target.value)}
        />
      )}
    </Modal>
  );
};

const formatMetadata = (val: string | null | undefined) => {
  if (!val) return '';
  try {
    const parsed = JSON.parse(val);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return val;
  }
};

export const TextColumn = ({
  record,
  recordKey,
  title,
  isEditable = true,
  canPublish,
  extra,
  className,
  showPopover = false,
}: {
  record: Version;
  recordKey: EditableVersionKey;
  title?: ReactNode;
  isEditable?: boolean;
  /** 由表格层查一次权限后传下来，避免每个单元格各挂一个 query observer */
  canPublish: boolean;
  extra?: ReactNode;
  className?: string;
  showPopover?: boolean;
}) => {
  const key = recordKey;
  const { appId } = useManageContext();
  const updateVersion = useUpdateVersion();
  const [editing, setEditing] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { t } = useTranslation();
  // 只读角色隐藏所有编辑入口
  isEditable = isEditable && canPublish;
  let value = record[key] as string;
  if (key === 'createdAt') {
    value = formatDateTime(value);
  }

  const popoverContent = (
    <div className="flex flex-col gap-2 text-[var(--ant-color-text)]">
      {isEditable && (
        <div className="flex items-center justify-between border-b border-[var(--ant-color-border-secondary)] pb-1 mb-1">
          <span className="font-medium text-xs text-[var(--ant-color-text-secondary)]">
            {title}
          </span>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setPopoverOpen(false);
              setEditing(true);
            }}
            className="p-0 h-auto text-xs text-[var(--ant-color-text)] hover:text-[var(--ant-color-primary)] flex items-center gap-1"
          >
            {t('common.edit')}
          </Button>
        </div>
      )}
      <div
        style={{ maxWidth: '400px', maxHeight: '250px', overflow: 'auto' }}
        className="whitespace-pre-wrap break-all text-sm text-[var(--ant-color-text)]"
      >
        {key === 'metaInfo' ? (
          <pre className="font-mono text-xs bg-[var(--ant-color-fill-quaternary)] text-[var(--ant-color-text)] p-2 rounded m-0 border border-[var(--ant-color-border-secondary)]">
            {formatMetadata(value)}
          </pre>
        ) : (
          value || (
            <span className="text-[var(--ant-color-text-tertiary)] italic">
              {t('common.none')}
            </span>
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {showPopover ? (
        <Popover
          open={popoverOpen}
          onOpenChange={(open) => setPopoverOpen(open)}
          content={popoverContent}
          title={null}
          trigger="hover"
          placement="topLeft"
          overlayStyle={{ maxWidth: '420px' }}
        >
          <div className="w-full cursor-pointer py-1 px-1.5 -mx-1.5 rounded hover:bg-[var(--ant-color-fill-secondary)] transition-colors">
            <Typography.Text
              className={
                className ||
                'block max-w-[9rem] md:w-40 text-[var(--ant-color-text)]'
              }
              ellipsis
            >
              {value || (
                <span className="text-[var(--ant-color-text-tertiary)] italic">
                  -
                </span>
              )}
            </Typography.Text>
          </div>
        </Popover>
      ) : (
        <div className="py-1 px-1.5 -mx-1.5">
          <Typography.Text
            className={
              className ||
              'block max-w-[9rem] md:w-40 text-[var(--ant-color-text)]'
            }
            editable={
              isEditable
                ? { editing: false, onStart: () => setEditing(true) }
                : undefined
            }
            ellipsis
          >
            {value}
          </Typography.Text>
        </div>
      )}
      {extra}
      {editing && (
        <EditFieldModal
          title={title}
          isJson={key === 'metaInfo'}
          initialValue={value ?? ''}
          saving={updateVersion.isPending}
          onClose={() => setEditing(false)}
          onSubmit={(newValue) =>
            updateVersion.mutateAsync({
              appId,
              versionId: record.id,
              params: { [key]: newValue } as Partial<
                Omit<Version, 'id' | 'packages'>
              >,
            })
          }
        />
      )}
    </div>
  );
};
