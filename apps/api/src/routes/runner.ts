import { FastifyInstance } from "fastify";
import { applyReport } from "../orchestrator.js";

const reportBodySchema = {
  run_id: (v: unknown): v is string => typeof v === "string",
  status: (v: unknown): v is "succeeded" | "failed" =>
    v === "succeeded" || v === "failed",
  error_kind: (v: unknown) =>
    v == null || ["none", "code_failed", "test_failed", "infra_failed"].includes(v as string),
  summary: (v: unknown) => v == null || typeof v === "string",
  artifacts: (v: unknown) =>
    v == null ||
    (Array.isArray(v) &&
      v.every(
        (a: unknown) =>
          a !== null &&
          typeof a === "object" &&
          "type" in a &&
          "uri" in a &&
          typeof (a as { type: string }).type === "string" &&
          typeof (a as { uri: string }).uri === "string"
      )),
};

export default async function runnerRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      run_id?: unknown;
      status?: unknown;
      error_kind?: unknown;
      summary?: unknown;
      artifacts?: unknown;
    };
  }>("/api/runner/report", async (req, reply) => {
    const b = req.body ?? {};
    if (!reportBodySchema.run_id(b.run_id) || !reportBodySchema.status(b.status)) {
      return reply.status(400).send({ error: "run_id and status required" });
    }
    if (b.error_kind != null && !reportBodySchema.error_kind(b.error_kind)) {
      return reply.status(400).send({ error: "invalid error_kind" });
    }
    if (b.artifacts != null && !reportBodySchema.artifacts(b.artifacts)) {
      return reply.status(400).send({ error: "invalid artifacts" });
    }
    const result = applyReport({
      run_id: b.run_id,
      status: b.status,
      error_kind: b.error_kind as string | undefined,
      summary: b.summary as string | undefined,
      artifacts: b.artifacts as { type: string; uri: string }[] | undefined,
    });
    if ("error" in result) return reply.status(400).send({ error: result.error });
    return reply.send(result);
  });
}
