import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authLogin } from "@/api";

const isDev = import.meta.env.DEV;

export function LoginPage({ onLoginSuccess }: { onLoginSuccess?: () => void }) {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";
  const navigate = useNavigate();
  const [username, setUsername] = useState(isDev ? "admin" : "");
  const [password, setPassword] = useState(isDev ? "admin" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authLogin(username, password);
      onLoginSuccess?.();
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">
          Bull Board 控制台
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-foreground">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
