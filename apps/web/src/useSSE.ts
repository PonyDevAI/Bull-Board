import { useEffect, useRef } from "react";

type EventHandler = (data: unknown) => void;

export function useSSE(onTaskChanged?: EventHandler, onRunChanged?: EventHandler) {
  const onTaskRef = useRef(onTaskChanged);
  const onRunRef = useRef(onRunChanged);
  onTaskRef.current = onTaskChanged;
  onRunRef.current = onRunChanged;

  useEffect(() => {
    const url = "/api/events";
    const es = new EventSource(url);
    es.onmessage = (e) => {
      if (e.data && e.data.startsWith("{")) {
        try {
          const data = JSON.parse(e.data);
          if (data.taskId !== undefined) onTaskRef.current?.(data);
          if (data.taskId === undefined && data.id !== undefined) onRunRef.current?.(data);
        } catch {
          // ignore
        }
      }
    };
    es.addEventListener("task_status_changed", (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        onTaskRef.current?.(data);
      } catch {
        // ignore
      }
    });
    es.addEventListener("run_status_changed", (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        onRunRef.current?.(data);
      } catch {
        // ignore
      }
    });
    return () => es.close();
  }, []);
}
