import { DownOutlined, JavaScriptOutlined } from '@ant-design/icons';
import { Button, Dropdown, Modal, Spin } from 'antd';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Mode } from 'vanilla-jsoneditor';
import { useAllVersions } from '@/utils/hooks';
import { useManageContext } from '../hooks/useManageContext';
import JsonEditor from './json-editor';

// json-diff-kit 只在对比视图里用到，按需加载，别拖慢整个应用页。
const DepsDiff = lazy(() =>
  import('./deps-diff').then((m) => ({ default: m.DepsDiff })),
);

export const DepsModal = ({
  open,
  onClose,
  deps,
  name,
}: {
  open: boolean;
  onClose: () => void;
  deps?: Record<string, string>;
  name?: string;
}) => {
  const { t } = useTranslation();
  const { packages, appId } = useManageContext();
  const { versions, isLoading: versionsLoading } = useAllVersions({
    appId,
    enabled: open,
  });
  const [diffs, setDiffs] = useState<{
    oldDeps?: Record<string, string>;
    newDeps?: Record<string, string>;
    newName?: string;
  } | null>(null);

  const handleClose = () => {
    setDiffs(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      maskClosable
      keyboard
      destroyOnClose
      footer={null}
      width={760}
      title={
        <div className="flex items-center justify-between gap-4 pr-6">
          <div className="font-semibold text-base truncate text-[var(--ant-color-text)]">
            {!diffs ? (
              <span>
                {t('deps_table.js_deps_title')}
                {name ? ` (${name})` : ''}
              </span>
            ) : (
              <span>
                <span>{diffs.newName}</span>
                <span className="font-normal text-[var(--ant-color-text-tertiary)] mx-2">
                  ⟷
                </span>
                <span>{name}</span>
              </span>
            )}
          </div>
          {deps && (
            <div className="shrink-0">
              {diffs ? (
                <Button size="small" onClick={() => setDiffs(null)}>
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
                      const [type, id = ''] = key.split('_');
                      if (type === 'p') {
                        const pkg = packages.find((p) => p.id === +id);
                        setDiffs({
                          oldDeps: pkg?.deps,
                          newDeps: deps,
                          newName: t('deps_table.native_package_with_name', {
                            name: pkg?.name,
                          }),
                        });
                      } else {
                        const version = versions.find((v) => v.id === +id);
                        setDiffs({
                          oldDeps: version?.deps,
                          newDeps: deps,
                          newName: t('deps_table.ota_version_with_name', {
                            name: version?.name,
                          }),
                        });
                      }
                    },
                  }}
                >
                  <Button size="small">
                    {t('deps_table.compare')}
                    <DownOutlined />
                  </Button>
                </Dropdown>
              )}
            </div>
          )}
        </div>
      }
    >
      <div className="pt-2">
        {deps ? (
          <>
            <div className="min-h-[200px] max-h-[60vh] overflow-auto">
              {diffs ? (
                <Suspense
                  fallback={
                    <div className="flex h-64 items-center justify-center">
                      <Spin />
                    </div>
                  }
                >
                  <DepsDiff oldDeps={diffs.oldDeps} newDeps={diffs.newDeps} />
                </Suspense>
              ) : (
                <JsonEditor
                  className="h-[420px]"
                  content={{
                    json: Object.keys(deps)
                      .sort()
                      .reduce(
                        (obj, key) => {
                          obj[key] = deps[key] ?? '';
                          return obj;
                        },
                        {} as Record<string, string>,
                      ),
                  }}
                  mode={'tree' as Mode}
                  mainMenuBar={false}
                  statusBar={false}
                  readOnly
                />
              )}
            </div>
            <div className="mt-3 text-xs text-[var(--ant-color-text-secondary)]">
              {t('deps_table.note')}
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <h4 className="text-sm font-medium mb-1 text-[var(--ant-color-text)]">
              {t('deps_table.js_deps_heading')}
            </h4>
            <div className="text-xs text-[var(--ant-color-text-secondary)]">
              {t('deps_table.cli_required')}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export const DepsTable = ({
  deps,
  name,
}: {
  deps?: Record<string, string>;
  name?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="link"
        icon={<JavaScriptOutlined />}
        onClick={() => setOpen(true)}
      />
      <DepsModal
        open={open}
        onClose={() => setOpen(false)}
        deps={deps}
        name={name}
      />
    </>
  );
};
