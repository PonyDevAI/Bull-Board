import { FastifyInstance } from "fastify";
import { addSubscriber } from "../sse.js";

export default async function eventsRoutes(app: FastifyInstance) {
  app.get("/api/events", async (req, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    if (typeof reply.raw.flushHeaders === "function") reply.raw.flushHeaders();
    addSubscriber(reply.raw);

    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(": heartbeat\n\n");
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    req.raw.on("close", () => clearInterval(heartbeat));
  });
}
