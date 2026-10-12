import { describe, expect, test } from 'bun:test';
import type { FormInstance, FormRule } from 'antd';
import { confirmPasswordRule, passwordFormatRule } from './password-rules';

/** 取出规则的 validator 并执行；fields 模拟表单里其他字段的值。 */
async function runRule(
  rule: FormRule,
  value: string | undefined,
  fields: Record<string, string | undefined> = {},
) {
  const form = {
    getFieldValue: (name: string) => fields[name],
  } as unknown as FormInstance;
  const resolved = typeof rule === 'function' ? rule(form) : rule;
  try {
    // 测试里只关心 validator 的结果，rule 参数用不到
    await resolved.validator?.({} as never, value, () => {});
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}

describe('passwordFormatRule', () => {
  const rule = passwordFormatRule('bad format');

  test('空值放行', async () => {
    expect(await runRule(rule, '')).toBeNull();
    expect(await runRule(rule, undefined)).toBeNull();
  });

  test('合法密码通过', async () => {
    expect(await runRule(rule, 'Passw0rd')).toBeNull();
  });

  test('不合法密码报传入的文案', async () => {
    expect(await runRule(rule, 'short')).toBe('bad format');
  });
});

describe('confirmPasswordRule', () => {
  test('与目标字段一致时通过', async () => {
    const rule = confirmPasswordRule({
      field: 'pwd',
      message: 'mismatch',
      allowEmpty: false,
    });
    expect(await runRule(rule, 'Passw0rd', { pwd: 'Passw0rd' })).toBeNull();
    expect(await runRule(rule, 'Other0rd', { pwd: 'Passw0rd' })).toBe(
      'mismatch',
    );
  });

  test('allowEmpty=false 时空值也参与比较', async () => {
    const rule = confirmPasswordRule({
      field: 'pwd',
      message: 'mismatch',
      allowEmpty: false,
    });
    expect(await runRule(rule, '', { pwd: 'Passw0rd' })).toBe('mismatch');
    expect(await runRule(rule, undefined, { pwd: undefined })).toBeNull();
  });

  test('allowEmpty=true 时空值直接放行', async () => {
    const rule = confirmPasswordRule({
      field: 'newPassword',
      message: 'mismatch',
      allowEmpty: true,
    });
    expect(await runRule(rule, '', { newPassword: 'Passw0rd' })).toBeNull();
    expect(await runRule(rule, 'Other0rd', { newPassword: 'Passw0rd' })).toBe(
      'mismatch',
    );
  });
});
