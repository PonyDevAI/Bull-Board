import type { ServerResponse } from "node:http";

const subscribers = new Set<ServerResponse>();

export function addSubscriber(res: ServerResponse): void {
  subscribers.add(res);
  res.on("close", () => subscribers.delete(res));
}

export function broadcast(event: string, data: unknown): void {
  const payload = "event: " + event + "\ndata: " + JSON.stringify(data) + "\n\n";
  for (const res of subscribers) {
    try {
      res.write(payload);
    } catch {
      subscribers.delete(res);
    }
  }
}
