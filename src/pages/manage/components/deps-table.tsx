import { JavaScriptOutlined } from "@ant-design/icons";
import { Popover, Button } from "antd";
import JsonEditor from "./json-editor";
import { Mode } from "vanilla-jsoneditor";

export const DepsTable = ({ deps }: { deps?: Record<string, string> }) => {
  return (
    <Popover
      className="ant-typography-edit"
      content={
        <div>
          <div className="text-center my-1 mx-auto">
            <h4>JavaScript 依赖列表</h4>
            {deps ? (
              <div>
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
                  readOnly
                />
                <div className="text-gray-500 my-4">
                  仅在<span className="font-bold underline">上传</span>
                  时抓取package.json的直接依赖，
                  不保证严格匹配包内容，仅供参考。
                </div>
              </div>
            ) : (
              <div className="text-gray-500">
                需要使用 cli v1.42.0+ 版本上传，且使用 git
                管理代码才能查看依赖列表
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
