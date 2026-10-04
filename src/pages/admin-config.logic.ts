/**
 * Pure logic for the schema-driven dynamic config page: the server describes
 * every registered key with a small JSON-schema-like tree, and this module maps
 * stored values to form values and back, and server error paths to form fields.
 *
 * The form keeps the whole config value under a single `value` field so the
 * root (object, array or bare string) always has a name path.
 */

export interface LocalizedText {
  zh: string;
  en: string;
}

export type FieldType =
  | 'object'
  | 'array'
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean';

export interface FieldSchema {
  type: FieldType;
  title?: LocalizedText;
  description?: LocalizedText;
  properties?: PropertySchema[];
  items?: FieldSchema;
  enum?: string[];
  pattern?: string;
  /** Human description of `pattern`, shown instead of the raw regex. */
  patternMessage?: LocalizedText;
  format?: 'url' | 'https-url';
  minimum?: number;
  maximum?: number;
  secret?: boolean;
  example?: unknown;
  default?: unknown;
}

export interface PropertySchema extends FieldSchema {
  name: string;
  required?: boolean;
}

export interface ConfigIssue {
  path: string;
  message: string;
}

export type ConfigState = 'unset' | 'set' | 'invalid';

export interface ConfigSchemaItem {
  key: string;
  group: string;
  title: LocalizedText;
  description: LocalizedText;
  encoding: 'json' | 'text';
  schema: FieldSchema;
  example: string;
  state: ConfigState;
  value?: string;
  issues?: ConfigIssue[];
}

export interface ConfigSchemaResult {
  groups: Array<{ key: string; title: LocalizedText }>;
  items: ConfigSchemaItem[];
  unregistered: Array<{ key: string; value: string }>;
}

/** The root form field that holds the whole config value. */
export const VALUE_FIELD = 'value';

export type NamePath = Array<string | number>;

/** zh-CN (or any zh*) picks the Chinese text, everything else English. */
export function pickLocale(language: string | undefined): 'zh' | 'en' {
  return language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function localize(
  text: LocalizedText | undefined,
  locale: 'zh' | 'en',
): string {
  if (!text) return '';
  return text[locale] || text[locale === 'zh' ? 'en' : 'zh'] || '';
}

const MASKED_SECRET = /^[\s\S]{0,7}…\(\d+ chars\)$/;

/** Whether a string is the server's masked secret form `abcdefg…(N chars)`. */
export function isMaskedSecret(value: unknown): value is string {
  return typeof value === 'string' && MASKED_SECRET.test(value);
}

/** Legacy text values may be stored JSON-quoted; strip one pair of quotes. */
export function stripTextQuotes(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'string') return parsed;
    } catch {
      // Not valid JSON: fall through to removing the outer quotes verbatim.
    }
    return value.slice(1, -1);
  }
  return value;
}

/** The stored value decoded for the form: a bare string or a parsed JSON value. */
export function decodeStoredValue(item: ConfigSchemaItem): unknown {
  if (item.value === undefined) return undefined;
  if (item.encoding === 'text') return stripTextQuotes(item.value);
  try {
    return JSON.parse(item.value);
  } catch {
    return undefined;
  }
}

/** A compact read-only preview of the (masked) stored value. */
export function previewValue(item: ConfigSchemaItem): string {
  if (item.value === undefined) return '';
  if (item.encoding === 'text') return stripTextQuotes(item.value);
  try {
    return JSON.stringify(JSON.parse(item.value), null, 2);
  } catch {
    return item.value;
  }
}

/** Reads a nested value by a form name path (relative to the config value). */
export function valueAtPath(value: unknown, path: NamePath): unknown {
  let node = value;
  for (const segment of path) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string | number, unknown>)[segment];
  }
  return node;
}

/** The masked secret stored at a path, if any (used as placeholder and to relax `required`). */
export function storedSecretAt(stored: unknown, path: NamePath) {
  const value = valueAtPath(stored, path);
  return isMaskedSecret(value) ? value : undefined;
}

/**
 * Convert a decoded value into form values following the schema. Values whose
 * type does not match are dropped so a partly invalid stored value still
 * prefills whatever is usable; masked secrets are never prefilled.
 */
export function toFormValue(schema: FieldSchema, value: unknown): unknown {
  switch (schema.type) {
    case 'object': {
      const source =
        value && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const result: Record<string, unknown> = {};
      for (const property of schema.properties ?? []) {
        const converted = toFormValue(property, source[property.name]);
        if (converted !== undefined) result[property.name] = converted;
      }
      return result;
    }
    case 'array': {
      if (!Array.isArray(value)) return [];
      const items = schema.items;
      if (!items) return [];
      return value.map((entry) => toFormValue(items, entry));
    }
    case 'string': {
      if (typeof value !== 'string') return undefined;
      if (schema.secret && isMaskedSecret(value)) return undefined;
      return value;
    }
    case 'integer':
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
    case 'boolean':
      if (typeof value === 'boolean') return value;
      // A Switch always shows a state, so show the effective default.
      return typeof schema.default === 'boolean' ? schema.default : false;
    default:
      return undefined;
  }
}

/** Initial form values for the editor of one config item. */
export function initialFormValues(item: ConfigSchemaItem): {
  value: unknown;
} {
  if (item.encoding === 'text') {
    const decoded = decodeStoredValue(item);
    const value =
      typeof decoded === 'string' &&
      !(item.schema.secret && isMaskedSecret(decoded))
        ? decoded
        : undefined;
    return { value };
  }
  return { value: toFormValue(item.schema, decodeStoredValue(item)) };
}

/** Form values for "Fill example": the example string or the parsed example document. */
export function exampleFormValue(item: ConfigSchemaItem): unknown {
  if (item.encoding === 'text') return item.example;
  try {
    return toFormValue(item.schema, JSON.parse(item.example));
  } catch {
    return toFormValue(item.schema, undefined);
  }
}

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

/**
 * Convert form values back into the JSON value to store. Optional properties
 * left empty are omitted; a secret left empty where a value is already stored
 * is sent as "" so the server keeps it. `stored` is the decoded stored value,
 * used to find which secrets already exist.
 */
export function fromFormValue(
  schema: FieldSchema,
  value: unknown,
  stored: unknown,
  path: NamePath = [],
): unknown {
  switch (schema.type) {
    case 'object': {
      const source =
        value && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const result: Record<string, unknown> = {};
      for (const property of schema.properties ?? []) {
        const childPath = [...path, property.name];
        const converted = fromFormValue(
          property,
          source[property.name],
          stored,
          childPath,
        );
        if (converted !== undefined) {
          result[property.name] = converted;
        } else if (property.secret && storedSecretAt(stored, childPath)) {
          result[property.name] = '';
        }
      }
      return path.length > 0 && Object.keys(result).length === 0
        ? undefined
        : result;
    }
    case 'array': {
      const items = schema.items;
      const list = Array.isArray(value) && items ? value : [];
      const result = list
        .map((entry, index) =>
          fromFormValue(items!, entry, stored, [...path, index]),
        )
        .filter((entry) => entry !== undefined);
      return path.length > 0 && result.length === 0 ? undefined : result;
    }
    case 'string':
      if (isEmpty(value) || typeof value !== 'string') return undefined;
      return value.trim();
    case 'integer':
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined;
    default:
      return undefined;
  }
}

export type SavePlan =
  | { kind: 'skip' }
  | { kind: 'save'; value: string }
  | { kind: 'empty' };

/**
 * The string to POST for a form submission. Text keys send the raw trimmed
 * string (never JSON-quoted); an empty text secret on a stored key means
 * "unchanged" and skips the request.
 */
export function planSave(item: ConfigSchemaItem, formValue: unknown): SavePlan {
  if (item.encoding === 'text') {
    const text = typeof formValue === 'string' ? formValue.trim() : '';
    if (text === '') {
      return item.schema.secret && item.state !== 'unset'
        ? { kind: 'skip' }
        : { kind: 'empty' };
    }
    return { kind: 'save', value: text };
  }
  const value = fromFormValue(item.schema, formValue, decodeStoredValue(item));
  // A root scalar (e.g. a bare number) left empty has nothing to serialize.
  if (value === undefined) return { kind: 'empty' };
  return { kind: 'save', value: JSON.stringify(value) };
}

/** Pretty JSON of what the form would save, for the advanced JSON editor. */
export function formValueToJsonText(
  item: ConfigSchemaItem,
  formValue: unknown,
): string {
  const value = fromFormValue(item.schema, formValue, decodeStoredValue(item));
  return value === undefined ? '' : JSON.stringify(value, null, 2);
}

/** Split a JSON-pointer-like path ("/0/semver") into segments; "" is the root. */
export function parseErrorPath(path: string): string[] {
  if (path === '' || path === '/') return [];
  return path
    .replace(/^\//, '')
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/**
 * Map a server error path to the form field that renders it. Returns null for
 * the root, for paths the schema does not know, and for objects (which have no
 * field of their own) so the error is shown in the form-level alert instead.
 */
export function errorPathToName(
  item: ConfigSchemaItem,
  path: string,
): NamePath | null {
  const segments = parseErrorPath(path);
  if (segments.length === 0) return null;
  let schema: FieldSchema | undefined = item.schema;
  const name: NamePath = [VALUE_FIELD];
  for (const segment of segments) {
    if (!schema) return null;
    if (schema.type === 'array') {
      if (!/^\d+$/.test(segment)) return null;
      name.push(Number(segment));
      schema = schema.items;
    } else if (schema.type === 'object') {
      schema = schema.properties?.find((property) => property.name === segment);
      name.push(segment);
    } else {
      return null;
    }
  }
  if (!schema || schema.type === 'object') return null;
  return name;
}

export interface MappedErrors {
  fields: Array<{ name: NamePath; errors: string[] }>;
  general: ConfigIssue[];
}

/** Group server validation errors into per-field errors and form-level ones. */
export function mapValidationErrors(
  item: ConfigSchemaItem,
  errors: ConfigIssue[],
): MappedErrors {
  const byField = new Map<string, { name: NamePath; errors: string[] }>();
  const general: ConfigIssue[] = [];
  for (const error of errors) {
    const name = errorPathToName(item, error.path);
    if (!name) {
      general.push(error);
      continue;
    }
    const id = JSON.stringify(name);
    const entry = byField.get(id) ?? { name, errors: [] };
    entry.errors.push(error.message);
    byField.set(id, entry);
  }
  return { fields: [...byField.values()], general };
}

/** Extract `{message, errors}` from a 400 response body. */
export function readValidationBody(body: unknown): {
  message?: string;
  errors: ConfigIssue[];
} {
  if (!body || typeof body !== 'object') return { errors: [] };
  const { message, errors } = body as { message?: unknown; errors?: unknown };
  const list = Array.isArray(errors)
    ? errors.filter(
        (entry): entry is ConfigIssue =>
          !!entry &&
          typeof entry === 'object' &&
          typeof (entry as ConfigIssue).path === 'string' &&
          typeof (entry as ConfigIssue).message === 'string',
      )
    : [];
  return {
    message: typeof message === 'string' ? message : undefined,
    errors: list,
  };
}

/** Items bucketed by group, in the server's group order; unknown groups go last. */
export function groupItems(result: ConfigSchemaResult) {
  const known = new Set(result.groups.map((group) => group.key));
  const sections: Array<{
    key: string;
    title?: LocalizedText;
    items: ConfigSchemaItem[];
  }> = result.groups.map((group) => ({
    key: group.key,
    title: group.title,
    items: result.items.filter((item) => item.group === group.key),
  }));
  const rest = result.items.filter((item) => !known.has(item.group));
  if (rest.length > 0) sections.push({ key: '', items: rest });
  return sections.filter((section) => section.items.length > 0);
}

/** Whether a numeric field holds a byte count, to show a GiB hint. */
export function isByteField(name: string | undefined, schema: FieldSchema) {
  return (
    (schema.type === 'integer' || schema.type === 'number') &&
    !!name &&
    /bytes/i.test(name)
  );
}

const GIB = 1024 ** 3;

export function formatGiB(bytes: number): string {
  const gib = bytes / GIB;
  return `${Number(gib.toFixed(2))} GiB`;
}

/** Whether a value is a valid URL, optionally requiring https. */
export function isValidUrl(value: string, httpsOnly: boolean): boolean {
  try {
    const url = new URL(value);
    if (httpsOnly) return url.protocol === 'https:';
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Compile a server-side pattern; patterns JS cannot parse are left to the server. */
export function compilePattern(pattern: string | undefined): RegExp | null {
  if (!pattern) return null;
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

/** Placeholder text for a field: the example value rendered as text. */
export function examplePlaceholder(schema: FieldSchema): string | undefined {
  const example = schema.example;
  if (example === undefined || example === null) return undefined;
  if (typeof example === 'object') return JSON.stringify(example);
  return String(example);
}

/** The client-side pattern rule message: the localized patternMessage, else null (show the regex). */
export function patternRuleMessage(
  schema: FieldSchema,
  locale: 'zh' | 'en',
): string | null {
  return localize(schema.patternMessage, locale) || null;
}

/** The schema node a server error path points at, or undefined when unknown. */
export function schemaAtPath(
  schema: FieldSchema,
  path: string,
): FieldSchema | undefined {
  let node: FieldSchema | undefined = schema;
  for (const segment of parseErrorPath(path)) {
    if (!node) return undefined;
    if (node.type === 'array' && /^\d+$/.test(segment)) {
      node = node.items;
    } else if (node.type === 'object') {
      node = node.properties?.find((property) => property.name === segment);
    } else {
      return undefined;
    }
  }
  return node;
}

/**
 * A human label for an issue path: field titles in the current language, list
 * entries as "<item> #n" (1-based). "" is the config item itself. Falls back
 * to the raw path when the schema does not know it.
 */
export function issuePathLabel(
  item: ConfigSchemaItem,
  path: string,
  locale: 'zh' | 'en',
  itemWord: string,
): string {
  const segments = parseErrorPath(path);
  if (segments.length === 0) return localize(item.title, locale) || item.key;
  const parts: string[] = [];
  let node: FieldSchema | undefined = item.schema;
  for (const segment of segments) {
    if (!node) return path;
    if (node.type === 'array' && /^\d+$/.test(segment)) {
      const itemTitle = localize(node.items?.title, locale) || itemWord;
      parts.push(`${itemTitle} #${Number(segment) + 1}`);
      node = node.items;
    } else if (node.type === 'object') {
      const property: PropertySchema | undefined = node.properties?.find(
        (candidate) => candidate.name === segment,
      );
      if (!property) return path;
      parts.push(localize(property.title, locale) || property.name);
      node = property;
    } else {
      return path;
    }
  }
  return parts.join(' · ');
}

/** Every patternMessage in a schema tree, for matching server messages. */
function collectPatternMessages(schema: FieldSchema): LocalizedText[] {
  const own = schema.patternMessage ? [schema.patternMessage] : [];
  const children = [
    ...(schema.properties ?? []),
    ...(schema.items ? [schema.items] : []),
  ];
  return [...own, ...children.flatMap(collectPatternMessages)];
}

export type IssueMessage =
  | { text: string }
  | { key: string; params?: Record<string, string> };

const TYPE_NAMES = new Set([
  'string',
  'boolean',
  'integer',
  'number',
  'array',
  'object',
]);

const FIXED_MESSAGES: Record<string, string> = {
  'Expected required property': 'admin_config.issue_required',
  'Expected http or https URL': 'admin_config.issue_url',
  'Expected https URL': 'admin_config.issue_https_url',
  'Expected non-empty string': 'admin_config.issue_non_empty',
  'Invalid JSON format': 'admin_config.issue_invalid_json',
};

/**
 * Localize a known server validation message. Returns an i18n key (+ params)
 * for known messages, the field's localized patternMessage when the message is
 * its English text, and the message verbatim otherwise. Type names come back
 * as `type` (the raw schema type) so the caller can translate them.
 */
export function localizeIssueMessage(
  item: ConfigSchemaItem,
  issue: ConfigIssue,
  locale: 'zh' | 'en',
): IssueMessage {
  const message = issue.message.trim();
  const fixed = FIXED_MESSAGES[message];
  if (fixed) return { key: fixed };
  const typeMatch = /^Expected (\w+)$/.exec(message);
  if (typeMatch?.[1] && TYPE_NAMES.has(typeMatch[1])) {
    return { key: 'admin_config.issue_type', params: { type: typeMatch[1] } };
  }
  const enumMatch = /^Expected one of: (.*)$/.exec(message);
  if (enumMatch) {
    return {
      key: 'admin_config.issue_enum',
      params: { values: enumMatch[1]! },
    };
  }
  const minMatch = /^Expected number to be greater or equal to (.+)$/.exec(
    message,
  );
  if (minMatch) {
    return { key: 'admin_config.issue_min', params: { value: minMatch[1]! } };
  }
  const maxMatch = /^Expected number to be less or equal to (.+)$/.exec(
    message,
  );
  if (maxMatch) {
    return { key: 'admin_config.issue_max', params: { value: maxMatch[1]! } };
  }
  const atPath = schemaAtPath(item.schema, issue.path)?.patternMessage;
  const candidates = [
    ...(atPath ? [atPath] : []),
    ...collectPatternMessages(item.schema),
  ];
  const pattern = candidates.find((candidate) => candidate.en === message);
  if (pattern) return { text: localize(pattern, locale) };
  return { text: issue.message };
}
