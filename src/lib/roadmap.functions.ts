import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { buildRoadmap } from "./roadmap.server";

export const analyzeLink = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string }) => {
    const url = String(input?.url ?? "").trim();
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol)) throw new Error();
    } catch {
      throw new Error("Link không hợp lệ. Hãy dán link bắt đầu bằng https://");
    }
    return { url };
  })
  .handler(async ({ data }) => {
    try {
      const roadmap = await buildRoadmap(data.url, getRequest()?.signal);
      return { roadmap, error: null as string | null };
    } catch (e) {
      return { roadmap: null, error: e instanceof Error ? e.message : "Có lỗi xảy ra." };
    }
  });
