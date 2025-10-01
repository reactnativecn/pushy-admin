import { cn } from "@/utils/helper";
import {
  AndroidFilled,
  AppleFilled,
  HarmonyOSOutlined,
} from "@ant-design/icons";

export default function PlatformIcon({
  platform,
  className,
}: {
  platform?: "android" | "ios" | "harmony";
  className?: string;
}) {
  if (!platform) {
    return null;
  }
  if (platform === "android") {
    return <AndroidFilled className={cn("text-[#3ddc84]!", className)} />;
  }
  if (platform === "ios") {
    return <AppleFilled className={cn("text-[#a6b1b7]!", className)} />;
  }
  return <HarmonyOSOutlined className={cn("text-[#a6b1b7]!", className)} />;
}
