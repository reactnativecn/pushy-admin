import type { FormRule } from 'antd';
import { isPasswordValid } from '@/utils/helper';

/**
 * 密码格式校验：空值放行（是否必填交给 required 规则或 input 的 required 属性），
 * 有值时必须满足 isPasswordValid。文案由调用方传入，各页沿用自己的 i18n key。
 */
export function passwordFormatRule(message: string): FormRule {
  return {
    validator: (_, value: string) =>
      !value || isPasswordValid(value)
        ? Promise.resolve()
        : Promise.reject(Error(message)),
  };
}

/**
 * 确认密码校验：与 field 字段的值必须一致。
 * allowEmpty 为 true 时空值直接放行（由单独的 required 规则提示）；
 * 为 false 时空值也要和 field 比较，对方有值就报不一致。
 */
export function confirmPasswordRule({
  field,
  message,
  allowEmpty,
}: {
  field: string;
  message: string;
  allowEmpty: boolean;
}): FormRule {
  return ({ getFieldValue }) => ({
    validator: (_, value: string) =>
      (allowEmpty && !value) || value === getFieldValue(field)
        ? Promise.resolve()
        : Promise.reject(Error(message)),
  });
}
