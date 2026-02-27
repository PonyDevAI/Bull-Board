import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Play, Square, RefreshCw, Trash2, ChevronDown } from "lucide-react";
import { getApiBase, getSystemLogs, authMe, type LogsUnit } from "@/api";
import { cn } from "@/lib/utils";

const btnPrimary =
  "inline-flex h-8 items-center justify-center rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 md:h-8 md:px-3.5 md:text-sm";
const btnSecondary =
  "inline-flex h-8 items-center justify-center rounded border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted md:h-8 md:px-3.5 md:text-sm";

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUnit = (searchParams.get("unit") as LogsUnit) || "control";
  const [unit, setUnit] = useState<LogsUnit>(initialUnit === "runner" ? "runner" : "control");
  const [lines, setLines] = useState<number>(200);
  const [query, setQuery] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [tailing, setTailing] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const u = searchParams.get("unit");
    if (u === "runner" || u === "control") {
      setUnit(u);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!autoScroll) return;
    const el = logContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [content, autoScroll]);

  useEffect(() => {
    loadOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, lines]);

  const loadOnce = async () => {
    setLoading(true);
    try {
      const res = await getSystemLogs(unit, lines, query || undefined);
      setContent(res.content || "");
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
    const url = (base || "") + `/api/system/logs/stream?unit=${unit}`;
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

  const handleChangeUnit = (next: LogsUnit) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("unit", next);
      return p;
    });
    setUnit(next);
    setContent("");
    stopTail();
  };

  const filteredLines = content
    .split("\n")
    .filter((line) => (query ? line.toLowerCase().includes(query.toLowerCase()) : true));
  const displayContent = filteredLines.join("\n");

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center md:justify-between md:p-4">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-xs md:text-sm">
            <button
              type="button"
              onClick={() => handleChangeUnit("control")}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-md px-3 font-medium",
                unit === "control"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              Control
            </button>
            <button
              type="button"
              onClick={() => handleChangeUnit("runner")}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-md px-3 font-medium",
                unit === "runner"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              Runner
            </button>
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
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground md:px-4 md:py-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{unit === "control" ? "bb.service" : "bb-runner.service"}</span>
            </span>
            <span className="hidden md:inline">日志来源：systemd / journalctl</span>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span>行数：{filteredLines.length}</span>
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

