import Fastify from "fastify";
import workspacesRoutes from "./routes/workspaces.js";
import tasksRoutes from "./routes/tasks.js";
import runsRoutes from "./routes/runs.js";
import eventsRoutes from "./routes/events.js";
import runnerRoutes from "./routes/runner.js";
import actionsRoutes from "./routes/actions.js";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { ok: true, service: "bull-board-control" };
});

await app.register(workspacesRoutes);
await app.register(tasksRoutes);
await app.register(runsRoutes);
await app.register(eventsRoutes);
await app.register(runnerRoutes);
await app.register(actionsRoutes);

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
