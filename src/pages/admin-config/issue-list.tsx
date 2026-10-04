import { useTranslation } from 'react-i18next';
import {
  type ConfigIssue,
  type ConfigSchemaItem,
  issuePathLabel,
  localizeIssueMessage,
} from '../admin-config.logic';

/** Localizes server issues: a field label for the path and a translated message. */
export function useIssueFormatter(item: ConfigSchemaItem, locale: 'zh' | 'en') {
  const { t } = useTranslation();
  const message = (issue: ConfigIssue) => {
    const localized = localizeIssueMessage(item, issue, locale);
    if ('text' in localized) return localized.text;
    const params = { ...localized.params };
    if (params.type) params.type = t(`admin_config.type_${params.type}`);
    return t(localized.key, params);
  };
  const label = (issue: ConfigIssue) =>
    issuePathLabel(item, issue.path, locale, t('admin_config.item'));
  return { message, label };
}

/** Validation issues as "field label: message" lines. */
export function IssueList({
  issues,
  item,
  locale,
}: {
  issues: ConfigIssue[];
  item: ConfigSchemaItem;
  locale: 'zh' | 'en';
}) {
  const format = useIssueFormatter(item, locale);
  return (
    <ul className="m-0 pl-4">
      {issues.map((issue, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: issues have no stable id
        <li key={index}>
          <span className="mr-1 font-medium">{format.label(issue)}:</span>
          {format.message(issue)}
        </li>
      ))}
    </ul>
  );
}
