import { Popover, Button } from "antd";
import dayjs from "dayjs";
import gitUrlParse from "git-url-parse";
import { PullRequestOutlined } from "@ant-design/icons";

export const Commit = ({ commit }: { commit?: Commit }) => {
  if (!commit) {
    return (
      <Popover
        className="ant-typography-edit"
        content={
          <div>
            <div className="text-center my-1 mx-auto">
              <div className="font-bold">最近的提交：</div>
              <div className="text-gray-500">
                需要使用 cli v1.42.0+ 版本上传，且使用 git
                管理代码才能查看提交记录
              </div>
            </div>
          </div>
        }
      >
        <Button type="link" icon={<PullRequestOutlined />} onClick={() => {}} />
      </Popover>
    );
  }

  const { origin, hash, message, author } = commit;
  let url = "";
  if (origin) {
    try {
      const { owner, name, source } = gitUrlParse(origin);
      url = `https://${source}/${owner}/${name}/commit/${hash}`;
    } catch (error) {
      console.error(error);
    }
  }

  const time = dayjs(+commit.timestamp * 1000);

  return (
    <Popover
      className="ant-typography-edit"
      content={
        <div>
          <div className="my-1 mx-auto">
            <div className="font-bold">最近的提交：</div>
            <div>作者：{author}</div>
            <div>
              时间：{time.fromNow()}（{time.format("YYYY-MM-DD HH:mm:ss")}）
            </div>
            <div>摘要：{message}</div>
            <hr />
            {url ? (
              <a
                className="text-xs"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                {hash}
              </a>
            ) : (
              <span className="text-xs">{hash}</span>
            )}
          </div>
        </div>
      }
    >
      <Button type="link" icon={<PullRequestOutlined />} onClick={() => {}} />
    </Popover>
  );
};
