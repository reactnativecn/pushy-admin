import { Descriptions, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import gitUrlParse from "git-url-parse";

export const Commit = ({ commit }: { commit?: Commit }) => {
  if (!commit) return null;
  const { origin, hash, message, author } = commit;
  let url = "";
  if (origin) {
    const { owner, name, source } = gitUrlParse(origin);
    url = `https://${source}/${owner}/${name}/commit/${hash}`;
  }

  const time = dayjs(+commit.timestamp * 1000);

  const messageEl = (
    <Typography.Text className="text-xs text-inherit" ellipsis>
      {message}
    </Typography.Text>
  );

  return (
    <div className="text-xs text-gray-500 flex flex-row">
      <span>{time.fromNow()}</span>
      <span className="mx-1">•</span>
      <Tooltip
        title={
          <>
            <div className="font-bold">最近的提交：</div>
            <div>作者：{author}</div>
            <div>时间：{time.format("YYYY-MM-DD HH:mm:ss")}</div>
            <div>摘要：{message}</div>
            <hr />
            <div className="text-xs">{hash}</div>
          </>
        }
      >
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="max-w-20">
            {messageEl}
          </a>
        ) : (
          messageEl
        )}
      </Tooltip>
    </div>
  );
};
