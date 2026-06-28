import { DownOutlined, JavaScriptOutlined } from '@ant-design/icons';
import { Button, Dropdown, Popover } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mode } from 'vanilla-jsoneditor';
import { useAllVersions } from '@/utils/hooks';
import { useManageContext } from '../hooks/useManageContext';
import { DepsDiff } from './deps-diff';
import JsonEditor from './json-editor';
export const DepsTable = ({
  deps,
  name,
}: {
  deps?: Record<string, string>;
  name?: string;
}) => {
  const { t } = useTranslation();
  const { packages, appId } = useManageContext();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { versions, isLoading: versionsLoading } = useAllVersions({
    appId,
    enabled: popoverOpen,
  });
  const [diffs, setDiffs] = useState<{
    oldDeps?: Record<string, string>;
    newDeps?: Record<string, string>;
    newName?: string;
  } | null>(null);
  return (
    <Popover
      className="ant-typography-edit"
      classNames={{ root: 'deps-popover' }}
      afterOpenChange={(visible) => {
        setPopoverOpen(visible);
        if (!visible) {
          setDiffs(null);
        }
      }}
      content={
        <div className="deps-popover-content">
          {deps ? (
            <>
              <div className="deps-popover-header">
                <div className="deps-popover-title">
                  <div>{t('deps_table.js_deps_title')}{!diffs && `(${name})`}</div>
                  {diffs && (
                    <div className="font-normal">
                      <span>{diffs.newName}</span>
                      {` <-> ${name}`}
                    </div>
                  )}
                </div>
                <div className="deps-popover-actions">
                  {diffs ? (
                    <Button
                      onClick={() => {
                        setDiffs(null);
                      }}
                    >
                      {t('deps_table.back')}
                    </Button>
                  ) : (
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'package',
                            type: 'group',
                            label: t('deps_table.native_packages'),
                            children: packages.reduce(
                              (acc, p) => {
                                if (p.deps) {
                                  acc.push({
                                    key: `p_${p.id}`,
                                    label: p.name,
                                  });
                                }
                                return acc;
                              },
                              [] as { key: string; label: string }[],
                            ),
                          },
                          {
                            key: 'version',
                            type: 'group',
                            label: t('deps_table.ota_versions'),
                            children: versionsLoading
                              ? [
                                  {
                                    key: 'version_loading',
                                    label: t('deps_table.loading'),
                                    disabled: true,
                                  },
                                ]
                              : versions.reduce(
                                  (acc, v) => {
                                    if (v.deps) {
                                      acc.push({
                                        key: `v_${v.id}`,
                                        label: v.name,
                                      });
                                    }
                                    return acc;
                                  },
                                  [] as {
                                    key: string;
                                    label: string;
                                    disabled?: boolean;
                                  }[],
                                ),
                          },
                        ],
                        onClick: ({ key }) => {
                          if (!key.includes('_')) {
                            return;
                          }
                          const [type, id] = key.split('_');
                          if (type === 'p') {
                            const pkg = packages.find((p) => p.id === +id);
                            setDiffs({
                              oldDeps: pkg?.deps,
                              newDeps: deps,
                              newName: t('deps_table.native_package_with_name', { name: pkg?.name }),
                            });
                          } else {
                            const version = versions.find((v) => v.id === +id);
                            setDiffs({
                              oldDeps: version?.deps,
                              newDeps: deps,
                              newName: t('deps_table.ota_version_with_name', { name: version?.name }),
                            });
                          }
                        },
                      }}
                    >
                      <Button>
                        {t('deps_table.compare')}
                        <DownOutlined />
                      </Button>
                    </Dropdown>
                  )}
                </div>
              </div>
              <div className="deps-popover-body">
                {diffs ? (
                  <DepsDiff oldDeps={diffs.oldDeps} newDeps={diffs.newDeps} />
                ) : (
                  <JsonEditor
                    className="deps-popover-json"
                    content={{
                      json: Object.keys(deps)
                        .sort() // Sort the keys alphabetically
                        .reduce(
                          (obj, key) => {
                            obj[key] = deps[key]; // Rebuild the object with sorted keys
                            return obj;
                          },
                          {} as Record<string, string>,
                        ),
                    }}
                    mode={Mode.tree}
                    mainMenuBar={false}
                    statusBar={false}
                    readOnly
                  />
                )}
              </div>
              <div className="deps-popover-note">
                {t('deps_table.note')}
              </div>
            </>
          ) : (
            <div>
              <h4>{t('deps_table.js_deps_heading')}</h4>
              <div className="text-gray-500">
                {t('deps_table.cli_required')}
              </div>
            </div>
          )}
        </div>
      }
    >
      <Button type="link" icon={<JavaScriptOutlined />} onClick={() => {}} />
    </Popover>
  );
};
