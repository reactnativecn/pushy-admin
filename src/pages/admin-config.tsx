import {
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Empty,
  message,
  Popconfirm,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/admin-api';
import { RequestError } from '@/services/request';
import { adminKeys } from '@/utils/query-keys';
import { useIsMobile } from '@/utils/responsive';
import { ConfigEditor } from './admin-config/config-editor';
import { IssueList } from './admin-config/issue-list';
import { LegacyConfigPage } from './admin-config/legacy-config';
import {
  type ConfigSchemaItem,
  type ConfigState,
  groupItems,
  localize,
  pickLocale,
  previewValue,
} from './admin-config.logic';

const { Title, Text, Paragraph } = Typography;

const STATE_COLOR: Record<ConfigState, string | undefined> = {
  unset: undefined,
  set: 'success',
  invalid: 'error',
};

function StateTag({ state }: { state: ConfigState }) {
  const { t } = useTranslation();
  const labels: Record<ConfigState, string> = {
    unset: t('admin_config.state_unset'),
    set: t('admin_config.state_set'),
    invalid: t('admin_config.state_invalid'),
  };
  return <Tag color={STATE_COLOR[state]}>{labels[state]}</Tag>;
}

function useDeleteConfig() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => adminApi.deleteConfig(key),
    onSuccess: () => {
      message.success(t('admin_config.deleted'));
      queryClient.invalidateQueries({ queryKey: adminKeys.configSchema() });
      queryClient.invalidateQueries({ queryKey: adminKeys.config() });
    },
  });
}

function ConfigEntry({
  item,
  locale,
  onEdit,
}: {
  item: ConfigSchemaItem;
  locale: 'zh' | 'en';
  onEdit: (item: ConfigSchemaItem) => void;
}) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteConfig();
  const description = localize(item.description, locale);
  const preview = previewValue(item);

  return (
    <div className="flex flex-col gap-2 border-0 border-b border-solid border-gray-100 py-4 last:border-b-0 md:flex-row md:items-start md:justify-between md:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Text strong>{localize(item.title, locale) || item.key}</Text>
          <Text code className="text-xs">
            {item.key}
          </Text>
          <StateTag state={item.state} />
        </div>
        {description && (
          <Paragraph type="secondary" className="mt-1! mb-0! text-sm">
            {description}
          </Paragraph>
        )}
        {item.state === 'invalid' && item.issues && item.issues.length > 0 && (
          <Alert
            type="error"
            showIcon
            className="mt-2"
            title={t('admin_config.stored_invalid')}
            description={
              <IssueList issues={item.issues} item={item} locale={locale} />
            }
          />
        )}
        {preview && (
          <pre className="m-0 mt-2 max-h-32 overflow-auto rounded bg-gray-100 p-2 text-xs">
            {preview}
          </pre>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button icon={<EditOutlined />} onClick={() => onEdit(item)}>
          {t('admin_config.edit')}
        </Button>
        {item.state !== 'unset' && (
          <Popconfirm
            title={t('admin_config.delete_title')}
            onConfirm={() => deleteMutation.mutate(item.key)}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
              aria-label={t('admin_config.delete')}
            />
          </Popconfirm>
        )}
      </div>
    </div>
  );
}

function UnregisteredTable({
  rows,
}: {
  rows: Array<{ key: string; value: string }>;
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const deleteMutation = useDeleteConfig();
  const columns: ColumnsType<{ key: string; value: string }> = [
    {
      title: t('admin_config.col_key'),
      dataIndex: 'key',
      key: 'key',
      width: 200,
    },
    {
      title: t('admin_config.col_value'),
      dataIndex: 'value',
      key: 'value',
      render: (value: string) => (
        <pre className="m-0 max-h-24 overflow-auto whitespace-pre-wrap break-all text-xs">
          {value}
        </pre>
      ),
    },
    {
      title: t('admin_config.col_action'),
      key: 'action',
      width: 80,
      render: (_: unknown, record) => (
        <Popconfirm
          title={t('admin_config.delete_title')}
          onConfirm={() => deleteMutation.mutate(record.key)}
        >
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            aria-label={t('admin_config.delete')}
            loading={
              deleteMutation.isPending &&
              deleteMutation.variables === record.key
            }
          />
        </Popconfirm>
      ),
    },
  ];
  return (
    <Table
      dataSource={rows}
      columns={columns}
      rowKey="key"
      size={isMobile ? 'small' : 'middle'}
      pagination={false}
      scroll={{ x: 560 }}
    />
  );
}

function SchemaConfigPage({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof adminApi.getConfigSchema>>>;
}) {
  const { t, i18n } = useTranslation();
  const locale = pickLocale(i18n.resolvedLanguage ?? i18n.language);
  const [editing, setEditing] = useState<ConfigSchemaItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const sections = groupItems(data);

  return (
    <div className="page-section flex flex-col gap-4">
      <Title level={4} className="m-0!">
        {t('admin_config.title')}
      </Title>
      {sections.map((section) => (
        <Card
          key={section.key || '__other'}
          title={
            section.title
              ? localize(section.title, locale)
              : t('admin_config.group_other')
          }
          size="small"
        >
          {section.items.map((item) => (
            <ConfigEntry
              key={item.key}
              item={item}
              locale={locale}
              onEdit={(target) => {
                setEditing(target);
                setEditorOpen(true);
              }}
            />
          ))}
        </Card>
      ))}
      {data.unregistered.length > 0 && (
        <Card title={t('admin_config.unregistered_title')} size="small">
          <Paragraph type="secondary" className="text-sm">
            {t('admin_config.unregistered_hint')}
          </Paragraph>
          <UnregisteredTable rows={data.unregistered} />
        </Card>
      )}
      {editing && (
        <ConfigEditor
          key={editing.key}
          item={editing}
          open={editorOpen}
          locale={locale}
          onClose={() => setEditorOpen(false)}
          afterClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export const Component = () => {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: adminKeys.configSchema(),
    queryFn: async () => {
      try {
        return await adminApi.getConfigSchema();
      } catch (err) {
        // Servers before the schema endpoint: fall back to the raw editor
        if (err instanceof RequestError && err.status === 404) return null;
        throw err;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="page-section flex justify-center py-16">
        <Spin />
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-section">
        <Alert
          type="error"
          showIcon
          title={t('admin_config.load_failed')}
          description={error.message}
          action={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={isFetching}
              onClick={() => refetch()}
            >
              {t('admin_config.retry')}
            </Button>
          }
        />
      </div>
    );
  }
  if (data === null) return <LegacyConfigPage />;
  if (!data) {
    return (
      <div className="page-section">
        <Empty />
      </div>
    );
  }
  return <SchemaConfigPage data={data} />;
};
