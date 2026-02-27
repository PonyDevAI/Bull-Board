import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Play, Square, RefreshCw, Trash2, ChevronDown, Copy } from "lucide-react";
import { getApiBase, getSystemLogs, authMe } from "@/api";
import { cn } from "@/lib/utils";

const btnPrimary =
  "inline-flex h-8 items-center justify-center rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 md:h-8 md:px-3.5 md:text-sm";
const btnSecondary =
  "inline-flex h-8 items-center justify-center rounded border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted md:h-8 md:px-3.5 md:text-sm";

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lines, setLines] = useState<number>(200);
  const [query, setQuery] = useState("");
  const [since, setSince] = useState<string>("30m");
  const [content, setContent] = useState("");
  const [lineCount, setLineCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tailing, setTailing] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copyDone, setCopyDone] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unit = searchParams.get("unit");
    if (unit && unit !== "control") {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("unit", "control");
        return p;
      });
    }
    const s = searchParams.get("since");
    if (s) {
      setSince(s);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!autoScroll) return;
    const el = logContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [content, autoScroll]);

  useEffect(() => {
    void loadOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, since]);

  const loadOnce = async () => {
    setLoading(true);
    try {
      const res = await getSystemLogs(lines, query || undefined, since || undefined);
      const text = res.content || "";
      setContent(text);
      const cnt = text ? text.split("\n").filter((l) => l).length : 0;
      setLineCount(cnt);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const stopTail = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setTailing(false);
  };

  const startTail = () => {
    stopTail();
    const base = getApiBase();
    const params = new URLSearchParams();
    params.set("unit", "control");
    if (since) params.set("since", since);
    if (query) params.set("query", query);
    const url = (base || "") + `/api/system/logs/stream?${params.toString()}`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;
    setTailing(true);

    es.onmessage = (e) => {
      const line = e.data ?? "";
      setContent((prev) => (prev ? prev + "\n" + line : line));
    };
    es.onerror = () => {
      stopTail();
      authMe()
        .then((u) => {
          if (!u) {
            window.location.href =
              "/login?returnTo=" +
              encodeURIComponent(window.location.pathname + window.location.search);
          }
        })
        .catch(() => {
          // ignore
        });
    };
  };

  const handleToggleTail = () => {
    if (tailing) {
      stopTail();
    } else {
      startTail();
    }
  };

  const displayContent = content;

  const currentCurl = useMemo(() => {
    const base = getApiBase();
    const origin = base || window.location.origin;
    const params = new URLSearchParams();
    params.set("lines", String(lines));
    if (since) params.set("since", since);
    if (query) params.set("query", query);
    const url = `${origin}/api/system/logs?${params.toString()}`;
    return `curl -b cookie.txt "${url}"`;
  }, [lines, since, query]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center md:justify-between md:p-4">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground md:text-sm">
            Control · bb.service
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground md:text-sm">
            <span>最近</span>
            <input
              type="number"
              min={50}
              max={2000}
              value={lines}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                setLines(v);
              }}
              className="h-8 w-20 rounded border border-border bg-background px-2 text-xs text-foreground outline-none caret-primary focus:border-primary focus:ring-1 focus:ring-primary md:h-8 md:w-24 md:text-sm"
            />
            <span>行</span>
          </div>
          <label className="inline-flex items-center gap-1 text-xs text-muted-foreground md:text-sm">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span>自动滚动</span>
          </label>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground md:text-sm">
            <span>时间范围</span>
            <select
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground outline-none caret-primary focus:border-primary focus:ring-1 focus:ring-primary md:h-8 md:text-sm"
            >
              <option value="15m">近 15 分钟</option>
              <option value="30m">近 30 分钟</option>
              <option value="1h">近 1 小时</option>
              <option value="24h">近 24 小时</option>
              <option value="">不限制</option>
            </select>
          </div>
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索关键字"
              className="h-8 w-full rounded-full border border-border/60 bg-muted/40 pl-3 pr-8 text-xs text-foreground placeholder:text-muted-foreground outline-none caret-primary focus:border-primary focus:ring-1 focus:ring-primary md:h-9 md:text-sm"
            />
            <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <button
            type="button"
            onClick={loadOnce}
            disabled={loading}
            className={btnSecondary}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            {loading ? "加载中…" : "刷新"}
          </button>
          <button type="button" onClick={handleToggleTail} className={btnPrimary}>
            {tailing ? (
              <>
                <Square className="mr-1 h-3.5 w-3.5" />
                停止 tail
              </>
            ) : (
              <>
                <Play className="mr-1 h-3.5 w-3.5" />
                开始 tail
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setContent("")}
            className={btnSecondary}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            清空
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(currentCurl);
                setCopyDone(true);
                setTimeout(() => setCopyDone(false), 2000);
              } catch {
                // ignore
              }
            }}
            className={btnSecondary}
          >
            <Copy className="mr-1 h-3.5 w-3.5" />
            {copyDone ? "已复制 curl" : "复制 curl"}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground md:px-4 md:py-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>bb.service</span>
            </span>
            <span className="hidden md:inline">日志来源：systemd / journalctl</span>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span>行数：{lineCount}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <div
          ref={logContainerRef}
          className="flex-1 overflow-auto bg-black text-xs text-emerald-100 md:text-[13px]"
        >
          <pre className="min-h-full whitespace-pre-wrap break-words bg-black p-3 font-mono leading-relaxed">
            {displayContent || (loading ? "加载中…" : "暂无日志")}
          </pre>
        </div>
      </div>
    </div>
  );
}

