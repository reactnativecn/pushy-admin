import { SaveOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Drawer, Form, message, Switch, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import JsonEditor from '@/pages/manage/components/json-editor';
import { adminApi } from '@/services/admin-api';
import { RequestError } from '@/services/request';
import { adminKeys } from '@/utils/query-keys';
import { useIsMobile } from '@/utils/responsive';
import {
  type ConfigIssue,
  type ConfigSchemaItem,
  decodeStoredValue,
  exampleFormValue,
  formValueToJsonText,
  initialFormValues,
  localize,
  mapValidationErrors,
  planSave,
  readValidationBody,
  toFormValue,
  VALUE_FIELD,
} from '../admin-config.logic';
import { IssueList, useIssueFormatter } from './issue-list';
import { SchemaField } from './schema-field';

const { Paragraph } = Typography;

interface ConfigEditorProps {
  item: ConfigSchemaItem;
  open: boolean;
  locale: 'zh' | 'en';
  onClose: () => void;
  afterClose: () => void;
}

/**
 * Drawer that edits one registered config key with a form rendered from its
 * schema, plus an advanced raw JSON mode. Mounted fresh for every edit.
 */
export function ConfigEditor({
  item,
  open,
  locale,
  onClose,
  afterClose,
}: ConfigEditorProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [form] = Form.useForm();
  const formatIssue = useIssueFormatter(item, locale);
  const stored = useMemo(() => decodeStoredValue(item), [item]);
  const initialValues = useMemo(() => initialFormValues(item), [item]);
  const isJson = item.encoding === 'json';
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [generalErrors, setGeneralErrors] = useState<ConfigIssue[]>([]);

  const saveMutation = useMutation({
    mutationFn: (value: string) =>
      adminApi.setConfig(item.key, value, { suppressErrorToast: true }),
    meta: { silentError: true },
    onSuccess: () => {
      message.success(t('admin_config.saved'));
      queryClient.invalidateQueries({ queryKey: adminKeys.configSchema() });
      queryClient.invalidateQueries({ queryKey: adminKeys.config() });
      onClose();
    },
    onError: (error) => {
      if (error instanceof RequestError && error.status === 400) {
        const body = readValidationBody(error.body);
        if (body.errors.length > 0) {
          if (jsonMode) {
            setGeneralErrors(body.errors);
          } else {
            // Field errors show the localized message; the general alert
            // localizes (and labels) its issues itself.
            const localized = body.errors.map((issue) => ({
              path: issue.path,
              message: formatIssue.message(issue),
            }));
            form.setFields(mapValidationErrors(item, localized).fields);
            setGeneralErrors(mapValidationErrors(item, body.errors).general);
          }
          message.error(t('admin_config.validation_failed'));
          return;
        }
      }
      if (!(error as { handled?: boolean }).handled) {
        message.error(error.message);
      }
    },
  });

  const replaceFormValue = (value: unknown) => {
    form.setFields([{ name: [VALUE_FIELD], value, errors: [] }]);
  };

  const handleFillExample = () => {
    const value = exampleFormValue(item);
    replaceFormValue(value);
    if (jsonMode) {
      setJsonText(formValueToJsonText(item, value));
    }
  };

  const handleToggleJson = (checked: boolean) => {
    if (checked) {
      setJsonText(formValueToJsonText(item, form.getFieldValue(VALUE_FIELD)));
    }
    setGeneralErrors([]);
    setJsonMode(checked);
  };

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    try {
      replaceFormValue(toFormValue(item.schema, JSON.parse(text)));
    } catch {
      // Keep the form as it was until the JSON is valid again.
    }
  };

  const handleSave = async () => {
    setGeneralErrors([]);
    if (jsonMode) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        message.error(t('admin_config.invalid_json'));
        return;
      }
      saveMutation.mutate(JSON.stringify(parsed));
      return;
    }
    try {
      await form.validateFields();
    } catch {
      // Validation failures are shown inline by the form
      return;
    }
    const plan = planSave(item, form.getFieldValue(VALUE_FIELD));
    if (plan.kind === 'skip') {
      onClose();
      return;
    }
    if (plan.kind === 'empty') {
      message.error(t('admin_config.value_required'));
      return;
    }
    saveMutation.mutate(plan.value);
  };

  const title = localize(item.title, locale) || item.key;

  return (
    <Drawer
      title={
        <div className="flex flex-col">
          <span>{title}</span>
          <span className="font-mono text-xs font-normal text-gray-500">
            {item.key}
          </span>
        </div>
      }
      size={isMobile ? '100%' : 720}
      open={open}
      onClose={onClose}
      afterOpenChange={(visible) => {
        if (!visible) afterClose();
      }}
      destroyOnHidden
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleFillExample}>
              {t('admin_config.fill_example')}
            </Button>
            {isJson && (
              <span className="flex items-center gap-2 text-sm">
                <Switch
                  id="admin-config-json-mode"
                  size="small"
                  checked={jsonMode}
                  onChange={handleToggleJson}
                />
                <label htmlFor="admin-config-json-mode">
                  {t('admin_config.advanced_json')}
                </label>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose}>{t('admin_config.cancel')}</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saveMutation.isPending}
              onClick={handleSave}
            >
              {t('admin_config.save')}
            </Button>
          </div>
        </div>
      }
    >
      {localize(item.description, locale) && (
        <Paragraph type="secondary">
          {localize(item.description, locale)}
        </Paragraph>
      )}
      {item.state === 'invalid' && item.issues && item.issues.length > 0 && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title={t('admin_config.stored_invalid')}
          description={
            <IssueList issues={item.issues} item={item} locale={locale} />
          }
        />
      )}
      {generalErrors.length > 0 && (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          title={t('admin_config.validation_failed')}
          description={
            <IssueList issues={generalErrors} item={item} locale={locale} />
          }
        />
      )}
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        className={jsonMode ? 'hidden' : undefined}
      >
        <SchemaField
          schema={item.schema}
          name={[VALUE_FIELD]}
          path={[]}
          required
          locale={locale}
          stored={stored}
          // The drawer title already names the key: no separate root label,
          // but rule messages still name the item.
          propName={localize(item.title, locale) || undefined}
          label={null}
        />
      </Form>
      {jsonMode && (
        <>
          <Paragraph type="secondary" className="text-xs">
            {t('admin_config.json_hint')}
          </Paragraph>
          <JsonEditor
            // The editor only fills its direct container, so the height must reach the inner div
            className={`${isMobile ? 'h-[320px]' : 'h-[480px]'} [&>div:last-child]:h-full`}
            content={{ text: jsonText }}
            onChange={(content) => {
              handleJsonChange(
                'text' in content
                  ? content.text
                  : JSON.stringify(content.json, null, 2),
              );
            }}
          />
        </>
      )}
    </Drawer>
  );
}
