import { DownOutlined, JavaScriptOutlined } from '@ant-design/icons';
import { Button, Dropdown, Popover } from 'antd';
import { useState } from 'react';
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
                  <div>JavaScript 依赖列表{!diffs && `(${name})`}</div>
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
                      返回
                    </Button>
                  ) : (
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'package',
                            type: 'group',
                            label: '原生包',
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
                            label: '热更包',
                            children: versionsLoading
                              ? [
                                  {
                                    key: 'version_loading',
                                    label: '加载中...',
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
                              newName: `原生包 ${pkg?.name}`,
                            });
                          } else {
                            const version = versions.find((v) => v.id === +id);
                            setDiffs({
                              oldDeps: version?.deps,
                              newDeps: deps,
                              newName: `热更包 ${version?.name}`,
                            });
                          }
                        },
                      }}
                    >
                      <Button>
                        对比变更
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
                仅在<span className="font-bold underline">上传</span>
                时抓取package.json的直接依赖， 不保证严格匹配包内容，仅供参考。
              </div>
            </>
          ) : (
            <div>
              <h4>JavaScript 依赖列表</h4>
              <div className="text-gray-500">
                需要使用 cli v1.42.0+ 版本上传才能查看依赖列表
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
