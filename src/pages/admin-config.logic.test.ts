import { describe, expect, test } from 'bun:test';
import en from '@/i18n/locales/en.json';
import zhCN from '@/i18n/locales/zh-CN.json';
import {
  type ConfigSchemaItem,
  type ConfigSchemaResult,
  compilePattern,
  decodeStoredValue,
  errorPathToName,
  exampleFormValue,
  type FieldSchema,
  formatGiB,
  formValueToJsonText,
  fromFormValue,
  groupItems,
  initialFormValues,
  isByteField,
  isMaskedSecret,
  issuePathLabel,
  isValidUrl,
  localize,
  localizeIssueMessage,
  mapValidationErrors,
  parseErrorPath,
  patternRuleMessage,
  pickLocale,
  planSave,
  previewValue,
  readValidationBody,
  schemaAtPath,
  storedSecretAt,
  stripTextQuotes,
  toFormValue,
} from './admin-config.logic';

const text = (en: string) => ({ zh: `zh:${en}`, en });

const semverLimitsSchema: FieldSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: [
      { name: 'semver', type: 'string', required: true },
      { name: 'platform', type: 'string', enum: ['ios', 'android', 'harmony'] },
      { name: 'toVersionAt', type: 'string' },
    ],
  },
};

const offsiteSchema: FieldSchema = {
  type: 'object',
  properties: [
    { name: 'enabled', type: 'boolean' },
    {
      name: 'endpoint',
      type: 'string',
      format: 'https-url',
      required: true,
    },
    { name: 'bucket', type: 'string', required: true },
    { name: 'accessKeyId', type: 'string', required: true },
    { name: 'secretAccessKey', type: 'string', required: true, secret: true },
    {
      name: 'maxBytesPerRun',
      type: 'integer',
      minimum: 1024 ** 3,
      default: 3 * 1024 ** 3,
    },
  ],
};

const makeItem = (
  overrides: Partial<ConfigSchemaItem> = {},
): ConfigSchemaItem => ({
  key: 'k',
  group: 'g',
  title: text('Title'),
  description: text('Desc'),
  encoding: 'json',
  schema: { type: 'string' },
  example: '',
  state: 'unset',
  ...overrides,
});

describe('locale', () => {
  test('zh-CN picks zh, everything else en', () => {
    expect(pickLocale('zh-CN')).toBe('zh');
    expect(pickLocale('zh')).toBe('zh');
    expect(pickLocale('en-US')).toBe('en');
    expect(pickLocale(undefined)).toBe('en');
  });

  test('localize falls back to the other language', () => {
    expect(localize({ zh: '中', en: 'En' }, 'zh')).toBe('中');
    expect(localize({ zh: '', en: 'En' }, 'zh')).toBe('En');
    expect(localize(undefined, 'en')).toBe('');
  });
});

describe('text values and masked secrets', () => {
  test('strips one pair of JSON quotes from legacy text values', () => {
    expect(stripTextQuotes('"re_abc"')).toBe('re_abc');
    expect(stripTextQuotes('re_abc')).toBe('re_abc');
    expect(stripTextQuotes('"a\\"b"')).toBe('a"b');
    expect(stripTextQuotes('""')).toBe('');
    expect(stripTextQuotes('"')).toBe('"');
  });

  test('recognizes the masked secret format', () => {
    expect(isMaskedSecret('sk_live…(32 chars)')).toBe(true);
    expect(isMaskedSecret('abc…(3 chars)')).toBe(true);
    expect(isMaskedSecret('sk_live_123')).toBe(false);
    expect(isMaskedSecret('toolongprefix…(32 chars)')).toBe(false);
    expect(isMaskedSecret(42)).toBe(false);
  });

  test('a stored text secret is never prefilled', () => {
    const item = makeItem({
      encoding: 'text',
      schema: { type: 'string', secret: true },
      state: 'set',
      value: 'sk_live…(32 chars)',
    });
    expect(initialFormValues(item)).toEqual({ value: undefined });
    expect(storedSecretAt(decodeStoredValue(item), [])).toBe(
      'sk_live…(32 chars)',
    );
  });

  test('a plain text value is prefilled with one pair of quotes stripped', () => {
    const item = makeItem({
      encoding: 'text',
      state: 'set',
      value: '"hello"',
    });
    expect(initialFormValues(item)).toEqual({ value: 'hello' });
    expect(previewValue(item)).toBe('hello');
  });
});

describe('toFormValue', () => {
  test('prefills arrays of objects and drops mistyped values', () => {
    expect(
      toFormValue(semverLimitsSchema, [
        { semver: '>=1.0', platform: 'ios', extra: 1 },
        { semver: 5, toVersionAt: '2026-01-01' },
        'garbage',
      ]),
    ).toEqual([
      { semver: '>=1.0', platform: 'ios' },
      { toVersionAt: '2026-01-01' },
      {},
    ]);
  });

  test('non-array values for an array schema become an empty list', () => {
    expect(toFormValue(semverLimitsSchema, { not: 'array' })).toEqual([]);
  });

  test('booleans show their default, masked secrets stay empty', () => {
    expect(
      toFormValue(offsiteSchema, {
        endpoint: 'https://x.r2.cloudflarestorage.com',
        secretAccessKey: 'abcdefg…(40 chars)',
        maxBytesPerRun: 1024,
      }),
    ).toEqual({
      enabled: false,
      endpoint: 'https://x.r2.cloudflarestorage.com',
      maxBytesPerRun: 1024,
    });
  });

  test('an unparseable stored JSON value prefills an empty form', () => {
    const item = makeItem({
      schema: offsiteSchema,
      state: 'invalid',
      value: '{not json',
    });
    expect(initialFormValues(item)).toEqual({ value: { enabled: false } });
    expect(previewValue(item)).toBe('{not json');
  });
});

describe('fromFormValue / planSave', () => {
  test('omits empty optional properties and trims strings', () => {
    expect(
      fromFormValue(
        semverLimitsSchema,
        [
          { semver: ' >=1.0 ', platform: undefined, toVersionAt: '' },
          { semver: '2.x', platform: null },
        ],
        undefined,
      ),
    ).toEqual([{ semver: '>=1.0' }, { semver: '2.x' }]);
  });

  test('drops empty array rows', () => {
    const cdn: FieldSchema = { type: 'array', items: { type: 'string' } };
    expect(fromFormValue(cdn, ['https://a', '', undefined], undefined)).toEqual(
      ['https://a'],
    );
    expect(fromFormValue(cdn, [], undefined)).toEqual([]);
    expect(
      fromFormValue(semverLimitsSchema, [{ semver: '' }], undefined),
    ).toEqual([]);
  });

  test('keeps false booleans and numbers, omits null numbers', () => {
    const schema: FieldSchema = {
      type: 'object',
      properties: [
        { name: 'enabled', type: 'boolean', required: true },
        { name: 'ratio', type: 'number' },
        { name: 'min', type: 'integer' },
      ],
    };
    expect(
      fromFormValue(schema, { enabled: false, ratio: 0, min: null }, undefined),
    ).toEqual({ enabled: false, ratio: 0 });
  });

  test('an empty secret keeps the stored one only when a value exists', () => {
    const stored = { secretAccessKey: 'abcdefg…(40 chars)' };
    const form = {
      enabled: true,
      endpoint: 'https://e',
      bucket: 'b',
      accessKeyId: 'id',
      secretAccessKey: '',
    };
    expect(fromFormValue(offsiteSchema, form, stored)).toEqual({
      enabled: true,
      endpoint: 'https://e',
      bucket: 'b',
      accessKeyId: 'id',
      secretAccessKey: '',
    });
    expect(fromFormValue(offsiteSchema, form, undefined)).toEqual({
      enabled: true,
      endpoint: 'https://e',
      bucket: 'b',
      accessKeyId: 'id',
    });
    expect(
      fromFormValue(
        offsiteSchema,
        { ...form, secretAccessKey: 'new-secret' },
        stored,
      ),
    ).toMatchObject({ secretAccessKey: 'new-secret' });
  });

  test('json encoding serializes compactly', () => {
    const item = makeItem({ schema: semverLimitsSchema });
    expect(planSave(item, [{ semver: '1.0', platform: 'ios' }])).toEqual({
      kind: 'save',
      value: '[{"semver":"1.0","platform":"ios"}]',
    });
    const root = makeItem({
      schema: { type: 'object', properties: [{ name: 'a', type: 'string' }] },
    });
    expect(planSave(root, { a: '' })).toEqual({ kind: 'save', value: '{}' });
  });

  test('text encoding sends the raw trimmed string, never JSON-quoted', () => {
    const item = makeItem({ encoding: 'text', schema: { type: 'string' } });
    expect(planSave(item, '  re_abc  ')).toEqual({
      kind: 'save',
      value: 're_abc',
    });
    expect(planSave(item, '')).toEqual({ kind: 'empty' });
  });

  test('an empty text secret on a stored key skips the request', () => {
    const secret = makeItem({
      encoding: 'text',
      schema: { type: 'string', secret: true },
      state: 'set',
      value: 'sk_live…(32 chars)',
    });
    expect(planSave(secret, undefined)).toEqual({ kind: 'skip' });
    expect(planSave(secret, '   ')).toEqual({ kind: 'skip' });
    expect(planSave({ ...secret, state: 'invalid' }, '')).toEqual({
      kind: 'skip',
    });
    expect(planSave({ ...secret, state: 'unset' }, '')).toEqual({
      kind: 'empty',
    });
    expect(planSave(secret, 'sk_new')).toEqual({
      kind: 'save',
      value: 'sk_new',
    });
  });
});

describe('example', () => {
  test('json examples are parsed into the form', () => {
    const item = makeItem({
      schema: semverLimitsSchema,
      example: '[{"semver":"<1.2","platform":"android"}]',
    });
    expect(exampleFormValue(item)).toEqual([
      { semver: '<1.2', platform: 'android' },
    ]);
  });

  test('text examples are used verbatim', () => {
    const item = makeItem({ encoding: 'text', example: 're_…' });
    expect(exampleFormValue(item)).toBe('re_…');
  });

  test('an unparseable json example yields an empty form', () => {
    const item = makeItem({ schema: semverLimitsSchema, example: '<nope>' });
    expect(exampleFormValue(item)).toEqual([]);
  });
});

describe('error paths', () => {
  test('parses JSON-pointer-like paths', () => {
    expect(parseErrorPath('')).toEqual([]);
    expect(parseErrorPath('/0/semver')).toEqual(['0', 'semver']);
    expect(parseErrorPath('/a~1b/c~0d')).toEqual(['a/b', 'c~d']);
  });

  test('maps paths to form names with numeric list indices', () => {
    const list = makeItem({ schema: semverLimitsSchema });
    expect(errorPathToName(list, '/0/semver')).toEqual(['value', 0, 'semver']);
    expect(errorPathToName(list, '/2/platform')).toEqual([
      'value',
      2,
      'platform',
    ]);
    // The object item itself has no field: shown at form level
    expect(errorPathToName(list, '/0')).toBeNull();
    expect(errorPathToName(list, '/x/semver')).toBeNull();
    expect(errorPathToName(list, '/0/unknown')).toBeNull();
    expect(errorPathToName(list, '')).toBeNull();

    const obj = makeItem({ schema: offsiteSchema });
    expect(errorPathToName(obj, '/secretAccessKey')).toEqual([
      'value',
      'secretAccessKey',
    ]);

    const cdn = makeItem({
      schema: { type: 'array', items: { type: 'string' } },
    });
    expect(errorPathToName(cdn, '/1')).toEqual(['value', 1]);
  });

  test('groups validation errors by field and keeps the rest general', () => {
    const list = makeItem({ schema: semverLimitsSchema });
    expect(
      mapValidationErrors(list, [
        { path: '/0/semver', message: 'required' },
        { path: '/0/semver', message: 'bad' },
        { path: '', message: 'root' },
        { path: '/1', message: 'item' },
      ]),
    ).toEqual({
      fields: [{ name: ['value', 0, 'semver'], errors: ['required', 'bad'] }],
      general: [
        { path: '', message: 'root' },
        { path: '/1', message: 'item' },
      ],
    });
  });

  test('reads the 400 body defensively', () => {
    expect(
      readValidationBody({
        message: 'Validation failed',
        errors: [{ path: '/a', message: 'm' }, { path: 1 }, null],
      }),
    ).toEqual({
      message: 'Validation failed',
      errors: [{ path: '/a', message: 'm' }],
    });
    expect(readValidationBody(undefined)).toEqual({ errors: [] });
    expect(readValidationBody({ message: 'Invalid JSON format' })).toEqual({
      message: 'Invalid JSON format',
      errors: [],
    });
  });
});

describe('grouping and helpers', () => {
  test('groups follow server order; unknown groups go last; empty groups hidden', () => {
    const result: ConfigSchemaResult = {
      groups: [
        { key: 'b', title: text('B') },
        { key: 'a', title: text('A') },
        { key: 'empty', title: text('E') },
      ],
      items: [
        makeItem({ key: 'a1', group: 'a' }),
        makeItem({ key: 'x1', group: 'x' }),
        makeItem({ key: 'b1', group: 'b' }),
      ],
      unregistered: [],
    };
    expect(
      groupItems(result).map((section) => [
        section.key,
        section.items.map((item) => item.key),
      ]),
    ).toEqual([
      ['b', ['b1']],
      ['a', ['a1']],
      ['', ['x1']],
    ]);
  });

  test('url validation', () => {
    expect(isValidUrl('https://a.com', true)).toBe(true);
    expect(isValidUrl('http://a.com', true)).toBe(false);
    expect(isValidUrl('http://a.com', false)).toBe(true);
    expect(isValidUrl('ftp://a.com', false)).toBe(false);
    expect(isValidUrl('not a url', false)).toBe(false);
  });

  test('byte hints and patterns', () => {
    expect(isByteField('maxBytesPerRun', { type: 'integer' })).toBe(true);
    expect(isByteField('minRollbacks', { type: 'integer' })).toBe(false);
    expect(formatGiB(3 * 1024 ** 3)).toBe('3 GiB');
    expect(formatGiB(1.5 * 1024 ** 3)).toBe('1.5 GiB');
    expect(compilePattern('^age1')?.test('age1xyz')).toBe(true);
    expect(compilePattern('(')).toBeNull();
    expect(compilePattern(undefined)).toBeNull();
  });
});

const ageMessage = {
  zh: '应为 age1 开头的公钥',
  en: 'Expected an age1 public key',
};

const labelledSemver: FieldSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: [
      {
        name: 'semver',
        type: 'string',
        required: true,
        title: { zh: '版本范围', en: 'Version range' },
      },
      { name: 'platform', type: 'string', enum: ['ios', 'android'] },
    ],
  },
};

const backupSchema: FieldSchema = {
  type: 'object',
  properties: [
    {
      name: 'secretAccessKey',
      type: 'string',
      secret: true,
      title: { zh: 'Secret Access Key', en: 'Secret Access Key' },
    },
    {
      name: 'ageRecipient',
      type: 'string',
      pattern: '^age1[02-9ac-hj-np-z]{58}$',
      patternMessage: ageMessage,
    },
  ],
};

describe('pattern messages', () => {
  test('client rule uses the localized patternMessage when present', () => {
    const field = backupSchema.properties![1]!;
    expect(patternRuleMessage(field, 'zh')).toBe('应为 age1 开头的公钥');
    expect(patternRuleMessage(field, 'en')).toBe('Expected an age1 public key');
    expect(patternRuleMessage({ type: 'string', pattern: '^a' }, 'zh')).toBe(
      null,
    );
  });
});

describe('issue labels', () => {
  const list = makeItem({
    title: { zh: '版本限制', en: 'Semver limits' },
    schema: labelledSemver,
  });
  const backup = makeItem({ schema: backupSchema });

  test('resolves paths to localized field titles', () => {
    expect(issuePathLabel(list, '/0/semver', 'zh', '条目')).toBe(
      '条目 #1 · 版本范围',
    );
    expect(issuePathLabel(list, '/0/semver', 'en', 'Item')).toBe(
      'Item #1 · Version range',
    );
    expect(issuePathLabel(list, '/2/platform', 'en', 'Item')).toBe(
      'Item #3 · platform',
    );
    expect(issuePathLabel(list, '/1', 'en', 'Item')).toBe('Item #2');
    expect(issuePathLabel(backup, '/secretAccessKey', 'en', 'Item')).toBe(
      'Secret Access Key',
    );
  });

  test('root is the item title; unknown paths stay raw', () => {
    expect(issuePathLabel(list, '', 'zh', '条目')).toBe('版本限制');
    expect(issuePathLabel(list, '/0/nope', 'en', 'Item')).toBe('/0/nope');
    expect(issuePathLabel(list, '/x', 'en', 'Item')).toBe('/x');
    expect(issuePathLabel(backup, '/secretAccessKey/0', 'en', 'Item')).toBe(
      '/secretAccessKey/0',
    );
  });

  test('schemaAtPath walks arrays and objects', () => {
    expect(schemaAtPath(labelledSemver, '/0/semver')?.type).toBe('string');
    expect(schemaAtPath(labelledSemver, '/0/missing')).toBeUndefined();
  });
});

describe('issue messages', () => {
  const backup = makeItem({ schema: backupSchema });
  const msg = (message: string, path = '', locale: 'zh' | 'en' = 'zh') =>
    localizeIssueMessage(backup, { path, message }, locale);

  test('known server messages map to i18n keys', () => {
    expect(msg('Expected required property')).toEqual({
      key: 'admin_config.issue_required',
    });
    for (const type of [
      'string',
      'boolean',
      'integer',
      'number',
      'array',
      'object',
    ]) {
      expect(msg(`Expected ${type}`)).toEqual({
        key: 'admin_config.issue_type',
        params: { type },
      });
    }
    expect(msg('Expected http or https URL')).toEqual({
      key: 'admin_config.issue_url',
    });
    expect(msg('Expected https URL')).toEqual({
      key: 'admin_config.issue_https_url',
    });
    expect(msg('Expected non-empty string')).toEqual({
      key: 'admin_config.issue_non_empty',
    });
    expect(msg('Invalid JSON format')).toEqual({
      key: 'admin_config.issue_invalid_json',
    });
    expect(msg('Expected one of: ios, android')).toEqual({
      key: 'admin_config.issue_enum',
      params: { values: 'ios, android' },
    });
    expect(msg('Expected number to be greater or equal to 1073741824')).toEqual(
      { key: 'admin_config.issue_min', params: { value: '1073741824' } },
    );
    expect(msg('Expected number to be less or equal to 1')).toEqual({
      key: 'admin_config.issue_max',
      params: { value: '1' },
    });
  });

  test('a patternMessage.en match shows the localized patternMessage', () => {
    expect(msg('Expected an age1 public key', '/ageRecipient')).toEqual({
      text: '应为 age1 开头的公钥',
    });
    // Matched anywhere in the schema even when the path is unknown
    expect(msg('Expected an age1 public key', '', 'en')).toEqual({
      text: 'Expected an age1 public key',
    });
  });

  test('unknown messages are shown verbatim', () => {
    expect(msg('Expected something else')).toEqual({
      text: 'Expected something else',
    });
    expect(msg('Expected thing')).toEqual({ text: 'Expected thing' });
  });

  test('every key and type name used exists in both locales', () => {
    const keys = [
      'issue_required',
      'issue_type',
      'issue_url',
      'issue_https_url',
      'issue_non_empty',
      'issue_invalid_json',
      'issue_enum',
      'issue_min',
      'issue_max',
      ...['string', 'boolean', 'integer', 'number', 'array', 'object'].map(
        (type) => `type_${type}`,
      ),
    ];
    for (const locale of [en, zhCN]) {
      const section = locale.admin_config as Record<string, string>;
      for (const key of keys) expect(typeof section[key]).toBe('string');
    }
  });
});

describe('pushy keys', () => {
  const monthlyPriceFactor = makeItem({
    key: 'monthlyPriceFactor',
    group: 'billing',
    schema: { type: 'number', minimum: 1 },
    example: '8',
    state: 'set',
    value: '8',
  });

  const legacyBsdiffAppIds = makeItem({
    key: 'legacyBsdiffAppIds',
    group: 'update',
    schema: { type: 'array', items: { type: 'integer', minimum: 1 } },
    example: '[1001,1002]',
    state: 'set',
    value: '[12,34]',
  });

  test('a root-level number prefills and serializes as a bare number', () => {
    expect(initialFormValues(monthlyPriceFactor)).toEqual({ value: 8 });
    expect(previewValue(monthlyPriceFactor)).toBe('8');
    expect(exampleFormValue(monthlyPriceFactor)).toBe(8);
    expect(planSave(monthlyPriceFactor, 8)).toEqual({
      kind: 'save',
      value: '8',
    });
    expect(planSave(monthlyPriceFactor, 1.5)).toEqual({
      kind: 'save',
      value: '1.5',
    });
    expect(formValueToJsonText(monthlyPriceFactor, 1.5)).toBe('1.5');
  });

  test('an empty or mistyped root number is not saved', () => {
    expect(planSave(monthlyPriceFactor, undefined)).toEqual({ kind: 'empty' });
    expect(planSave(monthlyPriceFactor, null)).toEqual({ kind: 'empty' });
    expect(formValueToJsonText(monthlyPriceFactor, undefined)).toBe('');
    expect(initialFormValues({ ...monthlyPriceFactor, value: '"8"' })).toEqual({
      value: undefined,
    });
  });

  test('root-number errors stay at form level', () => {
    expect(errorPathToName(monthlyPriceFactor, '')).toBeNull();
    expect(
      localizeIssueMessage(
        monthlyPriceFactor,
        {
          path: '',
          message: 'Expected number to be greater or equal to 1',
        },
        'zh',
      ),
    ).toEqual({ key: 'admin_config.issue_min', params: { value: '1' } });
  });

  test('an integer array prefills, drops empty rows and maps item errors', () => {
    expect(initialFormValues(legacyBsdiffAppIds)).toEqual({ value: [12, 34] });
    expect(exampleFormValue(legacyBsdiffAppIds)).toEqual([1001, 1002]);
    expect(toFormValue(legacyBsdiffAppIds.schema, [1, 'x', null])).toEqual([
      1,
      undefined,
      undefined,
    ]);
    expect(planSave(legacyBsdiffAppIds, [12, null, 34])).toEqual({
      kind: 'save',
      value: '[12,34]',
    });
    expect(planSave(legacyBsdiffAppIds, [])).toEqual({
      kind: 'save',
      value: '[]',
    });
    expect(errorPathToName(legacyBsdiffAppIds, '/1')).toEqual(['value', 1]);
    expect(issuePathLabel(legacyBsdiffAppIds, '/1', 'en', 'Item')).toBe(
      'Item #2',
    );
  });
});
