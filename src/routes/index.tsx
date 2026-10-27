import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { analyzeLink } from "@/lib/roadmap.functions";
import type { Roadmap } from "@/lib/roadmap-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bản Đồ Chinh Phục – Biến hệ thống bán hàng thành lộ trình game" },
      {
        name: "description",
        content:
          "Dán một link, AI tìm ra hệ thống bán hàng của người đó và biến thành bản đồ chinh phục từng giai đoạn để bạn làm theo.",
      },
      { property: "og:title", content: "Bản Đồ Chinh Phục" },
      {
        property: "og:description",
        content: "Biến bất kỳ hệ thống bán hàng nào thành lộ trình game có nhiệm vụ, điểm kiểm chứng và phần thưởng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Saved = { id: string; createdAt: number; url: string; roadmap: Roadmap; done: Record<string, boolean> };
const KEY = "ban-do-chinh-phuc-list";
const OLD_KEY = "ban-do-chinh-phuc";

function Index() {
  const analyze = useServerFn(analyzeLink);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maps, setMaps] = useState<Saved[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let list: Saved[] = [];
    try { list = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { /* ignore */ }
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      try { const o = JSON.parse(old); list.unshift({ id: crypto.randomUUID(), createdAt: Date.now(), ...o }); } catch { /* ignore */ }
      localStorage.removeItem(OLD_KEY);
    }
    setMaps(list);
    setActiveId(list[0]?.id ?? null);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(maps));
  }, [maps, ready]);

  const active = maps.find((m) => m.id === activeId) ?? null;
  const updateActive = (s: Saved) => setMaps((ms) => ms.map((m) => (m.id === s.id ? s : m)));
  const remove = (id: string) => {
    if (!confirm("Xóa bản đồ này?")) return;
    setMaps((ms) => ms.filter((m) => m.id !== id));
    if (activeId === id) setActiveId(null);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await analyze({ data: { url } });
      if (res.error || !res.roadmap) setError(res.error ?? "Có lỗi xảy ra.");
      else {
        const m: Saved = { id: crypto.randomUUID(), createdAt: Date.now(), url, roadmap: res.roadmap, done: {} };
        setMaps((ms) => [m, ...ms]);
        setActiveId(m.id);
        setOpen(0);
        setUrl("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <header className="text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Bản đồ chinh phục</p>
        <h1 className="mt-3 font-display text-4xl font-bold md:text-6xl">
          Dán một link. Nhận <span className="text-gold">lộ trình thành công</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          AI đọc trang, tìm ra hệ thống bán hàng của người đó và biến thành hành trình nhiều cửa ải — có nhiệm vụ, điểm kiểm chứng và phần thưởng.
        </p>
      </header>

      <form onSubmit={submit} className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://website-hoac-fanpage-cua-ho.com"
          className="flex-1 rounded-full border border-input bg-card px-5 py-3 outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          disabled={loading}
          className="rounded-full bg-gold px-7 py-3 font-semibold text-primary-foreground shadow-glow transition hover:scale-105 disabled:opacity-60"
        >
          {loading ? "Đang dò bản đồ…" : "Tạo hành trình"}
        </button>
      </form>
      {loading && <p className="mt-4 text-center text-sm text-muted-foreground">Mất khoảng 30–60 giây…</p>}
      {error && <p className="mx-auto mt-4 max-w-2xl rounded-xl bg-destructive/15 p-3 text-center text-destructive">{error}</p>}

      {maps.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Bản đồ đã lưu ({maps.length})</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {maps.map((m) => {
              const total = m.roadmap.stages.reduce((a, s) => a + s.quests.length, 0);
              const doneCount = Object.values(m.done).filter(Boolean).length;
              const on = m.id === activeId;
              return (
                <div key={m.id} className={`flex items-center gap-3 rounded-2xl border p-4 transition ${on ? "border-primary bg-card shadow-glow" : "border-border bg-card hover:border-accent"}`}>
                  <button onClick={() => { setActiveId(m.id); setOpen(null); }} className="min-w-0 flex-1 text-left">
                    <span className="block truncate font-display text-lg font-bold">{m.roadmap.owner}</span>
                    <span className="block truncate text-xs text-muted-foreground">{m.roadmap.topic}</span>
                    <span className="mt-1 block text-xs text-primary">{doneCount}/{total} nhiệm vụ · {new Date(m.createdAt).toLocaleDateString("vi-VN")}</span>
                  </button>
                  <button onClick={() => remove(m.id)} aria-label="Xóa bản đồ" className="rounded-full px-2 py-1 text-muted-foreground hover:text-destructive">✕</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {active && <Journey key={active.id} saved={active} setSaved={updateActive} open={open} setOpen={setOpen} />}
    </main>
  );
}

function Journey({
  saved, setSaved, open, setOpen,
}: { saved: Saved; setSaved: (s: Saved) => void; open: number | null; setOpen: (n: number | null) => void }) {
  const { roadmap, done } = saved;
  const stageDone = (i: number) => (roadmap.stages[i]?.quests ?? []).every((_, q) => done[`${i}-${q}`]);
  const unlocked = (i: number) => i === 0 || stageDone(i - 1);
  const stats = useMemo(() => {
    let xp = 0, total = 0;
    roadmap.stages.forEach((s, i) => { total += s.xp; if (stageDone(i)) xp += s.xp; });
    return { xp, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);
  const allDone = roadmap.stages.every((_, i) => stageDone(i));

  const toggle = (k: string) => setSaved({ ...saved, done: { ...done, [k]: !done[k] } });

  return (
    <section className="mt-14">
      <div className="rounded-3xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-widest text-accent">{roadmap.topic}</p>
        <h2 className="mt-1 font-display text-3xl font-bold">{roadmap.owner}</h2>
        <p className="mt-2 text-muted-foreground">{roadmap.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {roadmap.sellingSystem.map((s) => (
            <span key={s} className="rounded-full bg-secondary px-3 py-1 text-sm">{s}</span>
          ))}
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span>Kinh nghiệm</span>
            <span className="text-primary">{stats.xp} / {stats.total} XP</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gold transition-all duration-700" style={{ width: `${stats.total ? (stats.xp / stats.total) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <ol className="relative mt-10">
        {roadmap.stages.map((s, i) => {
          const lock = !unlocked(i);
          const ok = stageDone(i);
          const left = i % 2 === 0;
          return (
            <li key={i} className={`relative flex pb-10 ${left ? "justify-start" : "justify-end"}`}>
              {i < roadmap.stages.length - 1 && (
                <span className={`absolute left-1/2 top-16 h-full w-1 -translate-x-1/2 border-l-4 border-dashed ${ok ? "border-primary" : "border-border"}`} />
              )}
              <div className="w-full md:w-[48%]">
                <button
                  disabled={lock}
                  onClick={() => setOpen(open === i ? null : i)}
                  className={`relative z-10 flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                    ok ? "border-primary bg-card shadow-glow" : lock ? "border-border bg-muted opacity-50" : "border-accent bg-card hover:scale-[1.02]"
                  }`}
                >
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl ${ok ? "bg-gold" : "bg-secondary"} ${!lock && !ok ? "animate-float" : ""}`}>
                    {lock ? "🔒" : ok ? "🏆" : s.emoji}
                  </span>
                  <span>
                    <span className="block text-xs uppercase tracking-widest text-muted-foreground">Cửa ải {i + 1} · {s.timeframe}</span>
                    <span className="block font-display text-xl font-bold">{s.name}</span>
                    <span className="block text-sm text-primary">+{s.xp} XP</span>
                  </span>
                </button>
                {open === i && !lock && (
                  <div className="relative z-10 mt-3 space-y-3 rounded-2xl border border-border bg-card p-5">
                    <p><b className="text-accent">Đích đến:</b> {s.goal}</p>
                    <p className="text-sm"><b className="text-accent">KPI kiểm chứng:</b> {s.kpi}</p>
                    <ul className="space-y-2">
                      {s.quests.map((q, qi) => {
                        const k = `${i}-${qi}`;
                        return (
                          <li key={k}>
                            <label className={`flex cursor-pointer gap-3 rounded-xl p-3 transition ${done[k] ? "bg-secondary" : "bg-muted hover:bg-secondary"}`}>
                              <input type="checkbox" checked={!!done[k]} onChange={() => toggle(k)} className="mt-1 h-5 w-5 accent-primary" />
                              <span>
                                <span className={`block font-semibold ${done[k] ? "line-through opacity-70" : ""}`}>{q.title}</span>
                                <span className="block text-sm text-muted-foreground">{q.detail}</span>
                                <span className="mt-1 block text-xs text-accent">✓ Điểm kiểm chứng: {q.checkpoint}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="rounded-xl bg-gold p-3 text-sm font-semibold text-primary-foreground">🎁 Phần thưởng: {s.reward}</p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className={`rounded-3xl border-2 p-8 text-center ${allDone ? "border-primary shadow-glow" : "border-dashed border-border"}`}>
        <div className="text-5xl">{allDone ? "👑" : "🗺️"}</div>
        <h3 className="mt-2 font-display text-2xl font-bold">Đích đến cuối cùng</h3>
        <p className="mt-2 text-muted-foreground">{roadmap.finalReward}</p>
      </div>
    </section>
  );
}
