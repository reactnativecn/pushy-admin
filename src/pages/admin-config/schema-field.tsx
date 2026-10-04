import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Typography,
} from 'antd';
import type { Rule } from 'antd/es/form';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  compilePattern,
  examplePlaceholder,
  type FieldSchema,
  formatGiB,
  isByteField,
  isValidUrl,
  localize,
  type NamePath,
  patternRuleMessage,
  storedSecretAt,
  VALUE_FIELD,
} from '../admin-config.logic';

const { Text } = Typography;

export interface SchemaFieldProps {
  schema: FieldSchema;
  /** Form.Item name, relative to the enclosing Form.List when inside one. */
  name: NamePath;
  /** Absolute path inside the config value (without the root `value` field). */
  path: NamePath;
  /** Property name, used as the label fallback. */
  propName?: string;
  required?: boolean;
  locale: 'zh' | 'en';
  /** The decoded stored value, to find masked secrets. */
  stored: unknown;
  /** Label override; null renders no label (the drawer's root field). */
  label?: ReactNode;
}

const describe = (schema: FieldSchema, locale: 'zh' | 'en') =>
  localize(schema.description, locale);

function ByteHint({ path }: { path: NamePath }) {
  const value = Form.useWatch([VALUE_FIELD, ...path]);
  if (typeof value !== 'number' || value <= 0) return null;
  return <Text type="secondary">≈ {formatGiB(value)}</Text>;
}

function useLeafRules(
  schema: FieldSchema,
  label: string,
  required: boolean,
  locale: 'zh' | 'en',
): Rule[] {
  const { t } = useTranslation();
  const rules: Rule[] = [];
  if (required && schema.type !== 'boolean') {
    rules.push({
      required: true,
      whitespace: schema.type === 'string',
      message: t('admin_config.rule_required', { field: label }),
    });
  }
  if (schema.type === 'string') {
    const pattern = compilePattern(schema.pattern);
    if (pattern) {
      rules.push({
        pattern,
        message:
          patternRuleMessage(schema, locale) ??
          t('admin_config.rule_pattern', { pattern: schema.pattern }),
      });
    }
    if (schema.format === 'url' || schema.format === 'https-url') {
      const httpsOnly = schema.format === 'https-url';
      rules.push({
        validator: (_, value) =>
          !value || isValidUrl(String(value).trim(), httpsOnly)
            ? Promise.resolve()
            : Promise.reject(
                new Error(
                  t(
                    httpsOnly
                      ? 'admin_config.rule_https_url'
                      : 'admin_config.rule_url',
                  ),
                ),
              ),
      });
    }
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    if (schema.minimum !== undefined) {
      rules.push({
        type: 'number',
        min: schema.minimum,
        message: t('admin_config.rule_min', { min: schema.minimum }),
      });
    }
    if (schema.maximum !== undefined) {
      rules.push({
        type: 'number',
        max: schema.maximum,
        message: t('admin_config.rule_max', { max: schema.maximum }),
      });
    }
  }
  return rules;
}

function LeafField({
  schema,
  name,
  path,
  propName,
  required = false,
  locale,
  stored,
  label: labelOverride,
}: SchemaFieldProps) {
  const { t } = useTranslation();
  const title = localize(schema.title, locale) || propName || '';
  const maskedSecret = schema.secret ? storedSecretAt(stored, path) : undefined;
  // An existing secret may stay empty: empty means "keep the stored value".
  const rules = useLeafRules(schema, title, required && !maskedSecret, locale);
  const placeholder = examplePlaceholder(schema);
  const description = describe(schema, locale);
  const extra: ReactNode[] = [];
  if (schema.secret && maskedSecret) {
    extra.push(t('admin_config.keep_secret_hint'));
  }
  if (description) extra.push(description);
  if (schema.default !== undefined && schema.type !== 'boolean') {
    extra.push(
      t('admin_config.default_hint', {
        value:
          isByteField(propName, schema) && typeof schema.default === 'number'
            ? `${schema.default} (${formatGiB(schema.default)})`
            : JSON.stringify(schema.default),
      }),
    );
  }

  let input: ReactNode;
  switch (schema.type) {
    case 'boolean':
      input = <Switch />;
      break;
    case 'integer':
    case 'number': {
      const fraction =
        schema.type === 'number' &&
        schema.maximum !== undefined &&
        schema.maximum <= 1;
      input = (
        <InputNumber
          className="w-full!"
          min={schema.minimum}
          max={schema.maximum}
          precision={schema.type === 'integer' ? 0 : undefined}
          step={fraction ? 0.05 : 1}
          placeholder={placeholder}
        />
      );
      break;
    }
    default:
      if (schema.enum && schema.enum.length > 0) {
        input = (
          <Select
            allowClear={!required}
            placeholder={placeholder}
            options={schema.enum.map((value) => ({ value, label: value }))}
          />
        );
      } else if (schema.secret) {
        input = (
          <Input.Password
            autoComplete="new-password"
            placeholder={maskedSecret ?? placeholder}
          />
        );
      } else {
        input = <Input placeholder={placeholder} />;
      }
  }

  return (
    <Form.Item
      name={name}
      label={labelOverride === undefined ? title : labelOverride}
      required={required && !maskedSecret}
      rules={rules}
      valuePropName={schema.type === 'boolean' ? 'checked' : 'value'}
      extra={
        extra.length > 0 || isByteField(propName, schema) ? (
          <div className="flex flex-col">
            {extra.map((line, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static hint lines
              <span key={index}>{line}</span>
            ))}
            {isByteField(propName, schema) && <ByteHint path={path} />}
          </div>
        ) : undefined
      }
    >
      {input}
    </Form.Item>
  );
}

function FieldHeader({
  title,
  description,
  required,
}: {
  title: string;
  description: string;
  required?: boolean;
}) {
  if (!title && !description) return null;
  return (
    <div className="mb-2">
      {title && (
        <div className="font-medium">
          {required && <span className="mr-1 text-red-500">*</span>}
          {title}
        </div>
      )}
      {description && (
        <Text type="secondary" className="text-xs">
          {description}
        </Text>
      )}
    </div>
  );
}

function ObjectFields({
  schema,
  name,
  path,
  locale,
  stored,
}: Pick<SchemaFieldProps, 'schema' | 'name' | 'path' | 'locale' | 'stored'>) {
  return (
    <>
      {(schema.properties ?? []).map((property) => (
        <SchemaField
          key={property.name}
          schema={property}
          name={[...name, property.name]}
          path={[...path, property.name]}
          propName={property.name}
          required={property.required}
          locale={locale}
          stored={stored}
        />
      ))}
    </>
  );
}

function ArrayField({
  schema,
  name,
  path,
  propName,
  required,
  locale,
  stored,
  label,
}: SchemaFieldProps) {
  const { t } = useTranslation();
  const items = schema.items;
  if (!items) return null;
  const title = localize(schema.title, locale) || propName || '';
  const itemTitle = localize(items.title, locale);
  const objectItems = items.type === 'object';

  return (
    <div className="mb-6">
      {/* label={null} (the drawer root) renders no header of its own */}
      {label !== null && (
        <FieldHeader
          title={typeof label === 'string' ? label : title}
          description={describe(schema, locale)}
          required={required}
        />
      )}
      <Form.List name={name}>
        {(fields, { add, remove }, { errors }) => (
          <>
            {fields.map((field) => {
              const itemPath = [...path, field.name];
              const removeButton = (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={t('admin_config.remove_item')}
                  onClick={() => remove(field.name)}
                />
              );
              if (objectItems) {
                return (
                  <Card
                    key={field.key}
                    size="small"
                    className="mb-3"
                    title={`${itemTitle || t('admin_config.item')} #${field.name + 1}`}
                    extra={removeButton}
                  >
                    <ObjectFields
                      schema={items}
                      name={[field.name]}
                      path={itemPath}
                      locale={locale}
                      stored={stored}
                    />
                  </Card>
                );
              }
              return (
                <div key={field.key} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <LeafField
                      schema={items}
                      name={[field.name]}
                      path={itemPath}
                      required
                      locale={locale}
                      stored={stored}
                      label={null}
                    />
                  </div>
                  {removeButton}
                </div>
              );
            })}
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() =>
                add(
                  objectItems
                    ? Object.fromEntries(
                        (items.properties ?? [])
                          .filter((property) => property.type === 'boolean')
                          .map((property) => [
                            property.name,
                            typeof property.default === 'boolean'
                              ? property.default
                              : false,
                          ]),
                      )
                    : undefined,
                )
              }
            >
              {t('admin_config.add_item')}
            </Button>
            <Form.ErrorList errors={errors} />
          </>
        )}
      </Form.List>
    </div>
  );
}

/** Renders one schema node as form fields; nested objects and arrays recurse. */
export function SchemaField(props: SchemaFieldProps) {
  const { schema, name, path, propName, required, locale, stored, label } =
    props;
  if (schema.type === 'array') return <ArrayField {...props} />;
  if (schema.type === 'object') {
    if (path.length === 0) {
      return (
        <ObjectFields
          schema={schema}
          name={name}
          path={path}
          locale={locale}
          stored={stored}
        />
      );
    }
    return (
      <div className="mb-4 rounded-md border border-solid border-gray-200 p-3">
        <FieldHeader
          title={
            typeof label === 'string'
              ? label
              : localize(schema.title, locale) || propName || ''
          }
          description={describe(schema, locale)}
          required={required}
        />
        <ObjectFields
          schema={schema}
          name={name}
          path={path}
          locale={locale}
          stored={stored}
        />
      </div>
    );
  }
  return <LeafField {...props} />;
}
