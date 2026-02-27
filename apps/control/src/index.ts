import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import workspacesRoutes from "./routes/workspaces.js";
import tasksRoutes from "./routes/tasks.js";
import runsRoutes from "./routes/runs.js";
import eventsRoutes from "./routes/events.js";
import runnerRoutes from "./routes/runner.js";
import actionsRoutes from "./routes/actions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = Fastify({ logger: true });

const DEFAULT_PORT = 8888;

// Health: /api/health（对外）与 /health（兼容）
app.get("/api/health", async () => {
  return { ok: true, service: "bb" };
});
app.get("/health", async () => {
  return { ok: true, service: "bb" };
});

await app.register(workspacesRoutes);
await app.register(tasksRoutes);
await app.register(runsRoutes);
await app.register(eventsRoutes);
await app.register(runnerRoutes);
await app.register(actionsRoutes);

// Dashboard 静态托管：优先使用环境变量，否则相对 control 的 dist 找 dashboard/dist
const staticRoot =
  process.env.STATIC_DIR ||
  process.env.DASHBOARD_DIST ||
  path.resolve(__dirname, "../../dashboard/dist");

const staticRootExists = fs.existsSync(staticRoot);

if (staticRootExists) {
  await app.register(fastifyStatic, {
    root: staticRoot,
    prefix: "/",
  });
  // SPA fallback：静态未命中且非 /api 的 GET 返回 index.html
  app.setNotFoundHandler(async (request, reply) => {
    if (request.method !== "GET" || request.url.startsWith("/api"))
      return reply.callNotFound();
    return reply.sendFile("index.html", staticRoot);
  });
}

// TLS：从 BB_CONFIG 或 PREFIX/config/bb.json 读取，同端口 8888
function loadTlsConfig(): { key: Buffer; cert: Buffer } | null {
  const configPath =
    process.env.BB_CONFIG ||
    (process.env.PREFIX ? `${process.env.PREFIX}/config/bb.json` : null);
  if (!configPath || !fs.existsSync(configPath)) return null;
  const raw = fs.readFileSync(configPath, "utf8");
  let config: { tls?: { enabled?: boolean; certPath?: string; keyPath?: string } };
  try {
    config = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!config?.tls?.enabled || !config.tls.certPath || !config.tls.keyPath)
    return null;
  if (!fs.existsSync(config.tls.certPath) || !fs.existsSync(config.tls.keyPath))
    return null;
  return {
    key: fs.readFileSync(config.tls.keyPath),
    cert: fs.readFileSync(config.tls.certPath),
  };
}

const start = async () => {
  try {
    const port = Number(process.env.PORT) || DEFAULT_PORT;
    const tls = loadTlsConfig();
    if (tls) {
      await app.listen({ port, host: "0.0.0.0", https: tls });
    } else {
      await app.listen({ port, host: "0.0.0.0" });
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
