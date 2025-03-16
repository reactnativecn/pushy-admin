import { JavaScriptOutlined } from "@ant-design/icons";
import { Popover, Dropdown, Button } from "antd";
import JsonEditor from "./json-editor";
import { Mode } from "vanilla-jsoneditor";
import { useManageContext } from "../hooks/useManageContext";
import { useVersions } from "@/utils/hooks";
import { useState } from "react";
import { DepsDiff } from "./deps-diff";
export const DepsTable = ({
  deps,
  name,
}: {
  deps?: Record<string, string>;
  name?: string;
}) => {
  const { packages, appId } = useManageContext();
  const { versions } = useVersions({ appId, limit: 1000 });
  const [diffs, setDiffs] = useState<{
    oldDeps?: Record<string, string>;
    newDeps?: Record<string, string>;
    newName?: string;
  } | null>(null);
  return (
    <Popover
      className="ant-typography-edit"
      afterOpenChange={(visible) => {
        if (!visible) {
          setDiffs(null);
        }
      }}
      content={
        <div>
          <div className="text-center my-1 mx-auto">
            {deps ? (
              <div>
                <div className="flex flex-col items-center justify-center">
                  <h4>
                    JavaScript 依赖列表{!diffs && `(${name})`}
                    <div>
                      {diffs && (
                        <>
                          <span className="font-normal">{diffs.newName}</span>
                          {` <-> ${name}`}
                        </>
                      )}
                    </div>
                    <div className="absolute right-4 top-7">
                      {diffs ? (
                        <Button
                          className="content-end"
                          onClick={() => {
                            setDiffs(null);
                          }}
                        >
                          返回
                        </Button>
                      ) : (
                        <Dropdown.Button
                          className=""
                          menu={{
                            items: [
                              {
                                key: "package",
                                type: "group",
                                label: "原生包",
                                children: packages
                                  .filter((p) => !!p.deps)
                                  .map((p) => ({
                                    key: `p_${p.id}`,
                                    label: p.name,
                                  })),
                              },
                              {
                                key: "version",
                                type: "group",
                                label: "热更包",
                                children: versions
                                  .filter((v) => !!v.deps)
                                  .map((v) => ({
                                    key: `v_${v.id}`,
                                    label: v.name,
                                  })),
                              },
                            ],
                            onClick: ({ key }) => {
                              const [type, id] = key.split("_");
                              if (type === "p") {
                                const pkg = packages.find((p) => p.id === +id);
                                setDiffs({
                                  oldDeps: pkg?.deps,
                                  newDeps: deps,
                                  newName: "原生包 " + pkg?.name,
                                });
                              } else {
                                const version = versions.find(
                                  (v) => v.id === +id
                                );
                                setDiffs({
                                  oldDeps: version?.deps,
                                  newDeps: deps,
                                  newName: "热更包 " + version?.name,
                                });
                              }
                            },
                          }}
                        >
                          对比变更
                        </Dropdown.Button>
                      )}
                    </div>
                  </h4>
                  {diffs ? (
                    <DepsDiff oldDeps={diffs.oldDeps} newDeps={diffs.newDeps} />
                  ) : (
                    <JsonEditor
                      content={{
                        json: Object.keys(deps)
                          .sort() // Sort the keys alphabetically
                          .reduce(
                            (obj, key) => {
                              obj[key] = deps[key]; // Rebuild the object with sorted keys
                              return obj;
                            },
                            {} as Record<string, string>
                          ),
                      }}
                      mode={Mode.tree}
                      mainMenuBar={false}
                      statusBar={false}
                      readOnly
                    />
                  )}

                  <div className="text-gray-500 my-4">
                    仅在<span className="font-bold underline">上传</span>
                    时抓取package.json的直接依赖，
                    不保证严格匹配包内容，仅供参考。
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h4>JavaScript 依赖列表</h4>
                <div className="text-gray-500">
                  需要使用 cli v1.42.0+ 版本上传，且使用 git
                  管理代码才能查看依赖列表
                </div>
              </div>
            )}
          </div>
        </div>
      }
    >
      <Button type="link" icon={<JavaScriptOutlined />} onClick={() => {}} />
    </Popover>
  );
};
