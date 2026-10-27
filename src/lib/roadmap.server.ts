import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { Roadmap } from "./roadmap-types";

const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";

async function scrape(url: string, lovableKey: string, fcKey: string) {
  const res = await fetch(`${GATEWAY}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": fcKey,
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Firecrawl failed [${res.status}]: ${body}`);
    throw new Error(
      res.status === 402 || res.status === 403
        ? "Hết lượt đọc trang web. Vui lòng kiểm tra tín dụng của không gian làm việc."
        : "Không đọc được nội dung link này. Hãy thử link khác (website, bài viết, trang công khai).",
    );
  }
  const json = (await res.json()) as {
    data?: { markdown?: string; metadata?: { title?: string } };
    markdown?: string;
  };
  const md = json.data?.markdown ?? json.markdown ?? "";
  return { markdown: md.slice(0, 30000), title: json.data?.metadata?.title ?? "" };
}

const INSTRUCTIONS = `Bạn là chuyên gia phân tích hệ thống bán hàng và thiết kế lộ trình dạng game.
Từ nội dung trang được cung cấp, xác định: người/doanh nghiệp là ai, chủ đề/ngách, và HỆ THỐNG BÁN HÀNG thực tế của họ (nguồn khách, phễu, sản phẩm, chào bán, chăm sóc, chốt đơn).
Sau đó biến hệ thống đó thành một lộ trình chinh phục như game để người khác làm theo y hệt và đạt kết quả.
Yêu cầu: 5-7 giai đoạn, mỗi giai đoạn 3-5 nhiệm vụ cụ thể, có điểm kiểm chứng đo được (checkpoint), chỉ số KPI, thời gian, phần thưởng hấp dẫn và XP.
Viết bằng tiếng Việt, ngắn gọn, hành động được ngay. Dựa trên bằng chứng trong trang; nếu thiếu thông tin hãy suy luận hợp lý theo ngành.
CHỈ trả về JSON hợp lệ, không markdown, theo đúng cấu trúc:
{"owner":string,"topic":string,"summary":string,"sellingSystem":[string],"stages":[{"name":string,"emoji":string,"goal":string,"timeframe":string,"kpi":string,"reward":string,"xp":number,"quests":[{"title":string,"detail":string,"checkpoint":string}]}],"finalReward":string}`;

export async function buildRoadmap(url: string, signal?: AbortSignal): Promise<Roadmap> {
  const lovableKey = process.env['LOVABLE_API_KEY'];
  const fcKey = process.env['FIRECRAWL_API_KEY'];
  if (!lovableKey || !fcKey) throw new Error("Thiếu cấu hình máy chủ.");

  const page = await scrape(url, lovableKey, fcKey);
  if (page.markdown.trim().length < 50) {
    throw new Error("Trang này gần như không có nội dung công khai để phân tích. Hãy thử link khác.");
  }

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: lovableKey,
    headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: `Link: ${url}\nTiêu đề: ${page.title}\n\nNội dung trang (json output expected):\n${page.markdown}`,
      },
    ],
    abortSignal: signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  } as Parameters<typeof streamText>[0]);

  let text: string;
  try {
    text = await result.text;
  } catch (e) {
    console.error("AI failed", e);
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 402) throw new Error("Hết tín dụng AI. Vui lòng nạp thêm trong cài đặt.");
    if (status === 429) throw new Error("Hệ thống đang bận, thử lại sau ít phút.");
    throw new Error("AI không phân tích được trang này.");
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  try {
    return JSON.parse(text.slice(start, end + 1)) as Roadmap;
  } catch {
    console.error("Bad JSON", text.slice(0, 500));
    throw new Error("Kết quả AI không hợp lệ, hãy thử lại.");
  }
}
