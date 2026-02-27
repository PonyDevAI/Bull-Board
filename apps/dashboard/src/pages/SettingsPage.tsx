import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  authMe,
  authLogout,
  getSystemVersion,
  getSystemUpdate,
  ignoreVersion,
  getUpgradePlan,
  type ApiKeyItem,
  type SystemUpdate,
} from "@/api";
import { cn } from "@/lib/utils";

/** 固定 8 类（value/label 中文），宝塔风格 */
const SETTINGS_TABS = [
  { value: "system", label: "系统" },
  { value: "security", label: "安全" },
  { value: "access", label: "访问控制" },
  { value: "updates", label: "更新与维护" },
  { value: "secrets", label: "连接与凭据" },
  { value: "runners", label: "运行与资源" },
  { value: "backup", label: "数据与备份" },
  { value: "about", label: "关于" },
] as const;

type SettingsTabValue = (typeof SETTINGS_TABS)[number]["value"];
const TAB_VALUES = new Set<SettingsTabValue>(SETTINGS_TABS.map((t) => t.value));
function isValidTab(v: string | null): v is SettingsTabValue {
  return v !== null && TAB_VALUES.has(v as SettingsTabValue);
}

/** 单行设置项：标签 | 输入/开关 | 按钮 + 紧靠的提示文字（宝塔风格） */
function SettingRow({
  label,
  description,
  danger,
  children,
  action,
}: {
  label: string;
  description?: string;
  danger?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border bg-card py-3 last:border-b-0 md:flex-row md:items-center md:gap-3 md:py-3.5">
      <div className="w-full shrink-0 text-sm font-medium text-foreground md:w-[140px] md:shrink-0">
        {label}
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
        {action}
        {description && (
          <span
            className={cn(
              "mt-0.5 text-xs leading-snug md:text-[11px]",
              danger ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {description}
          </span>
        )}
      </div>
    </div>
  );
}

/** 占位输入（只读灰底，标准尺寸，聚焦绿色边框） */
function PlaceholderInput({ value }: { value: string }) {
  return (
    <input
      type="text"
      readOnly
      value={value}
      className="h-8 max-w-md rounded border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none caret-primary focus:border-primary focus:ring-1 focus:ring-primary md:h-9 md:min-w-[220px] md:px-3 md:text-sm"
    />
  );
}

/** 简易开关（宝塔风格：灰/绿，标准小尺寸） */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}

const btnPrimary =
  "inline-flex h-8 items-center justify-center rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 md:h-8 md:px-3.5 md:text-sm";
const btnSecondary =
  "inline-flex h-8 items-center justify-center rounded border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted md:h-8 md:px-3.5 md:text-sm";

// --- Access tab: 当前用户 + 退出 + API Keys ---
function AccessSection() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [loading, setUserLoading] = useState(true);

  useEffect(() => {
    authMe()
      .then((u) => setUser(u ?? null))
      .catch(() => setUser(null))
      .finally(() => setUserLoading(false));
  }, []);

  const handleLogout = () => {
    authLogout().then(() => navigate("/login", { replace: true }));
  };

  return (
    <div className="space-y-6">
      <SettingRow
        label="当前用户"
        description="当前登录面板的用户名。"
        action={
          <button type="button" disabled className={btnPrimary}>
            修改
          </button>
        }
      >
        <PlaceholderInput
          value={
            loading ? "加载中…" : user?.username ? user.username : "未登录"
          }
        />
      </SettingRow>
      <SettingRow label="退出登录" description="退出后需重新登录。">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(btnSecondary, "text-destructive hover:bg-destructive/10")}
        >
          退出
        </button>
      </SettingRow>
      <div className="pt-4">
        <p className="mb-3 text-sm font-medium text-foreground">API Keys</p>
        <ApiKeysSection />
      </div>
    </div>
  );
}

function ApiKeysSection() {
  const [list, setList] = useState<ApiKeyItem[] | null>([]);
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getApiKeys()
      .then((res) => {
        if (Array.isArray(res)) setList(res);
        else setList([]);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    setNewKeyPlain(null);
    try {
      const res = await createApiKey(createName || "API Key");
      setNewKeyPlain(res.api_key_plaintext ?? null);
      setCreateName("");
      load();
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingRow
        label="API 密钥"
        description="用于外部系统或 App 调用 API，支持 Authorization: Bearer &lt;key&gt; 或 X-API-Key: &lt;key&gt;。新建后明文仅显示一次，请妥善保存。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Key 名称（可选）"
              className="h-8 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none caret-primary focus:border-primary focus:ring-1 focus:ring-primary md:min-w-[200px]"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="h-8 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "创建中…" : "新建"}
            </button>
          </div>
        }
      >
        <span className="text-muted-foreground">
          {loading
            ? "加载中…"
            : !list || list.length === 0
              ? "暂无密钥"
              : `共 ${list.length} 个`}
        </span>
      </SettingRow>

      {newKeyPlain && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-400">
            新建 Key 明文（仅显示一次，请妥善保存）：
          </p>
          <code className="block break-all rounded bg-white/80 px-2 py-1.5 text-sm dark:bg-slate-800/80">
            {newKeyPlain}
          </code>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(newKeyPlain)}
            className="mt-2 h-8 rounded-lg border border-border bg-background px-3 text-sm hover:bg-muted"
          >
            复制
          </button>
        </div>
      )}

      {Array.isArray(list) && list.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">已创建的密钥</p>
          <ul className="space-y-2">
            {list.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3"
              >
                <div className="min-w-0">
                  <span className="font-medium">{k.name}</span>
                  <span className="ml-2 text-muted-foreground">…{k.prefix}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {k.createdAt ?? ""}
                  </span>
                  {k.revokedAt && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                      已撤销
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!k.revokedAt && (
                    <button
                      type="button"
                      onClick={() => revokeApiKey(k.id).then(load)}
                      className="h-8 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted"
                    >
                      撤销
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteApiKey(k.id).then(load)}
                    className="h-8 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// --- Updates tab: 当前版本、检查更新、release notes、忽略版本、复制升级命令 ---
function UpdatesSection() {
  const [version, setVersion] = useState<{ current_version: string } | null>(
    null
  );
  const [updateInfo, setUpdateInfo] = useState<SystemUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyDone, setCopyDone] = useState(false);
  const [ignoreLoading, setIgnoreLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getSystemVersion(), getSystemUpdate()])
      .then(([v, u]) => {
        setVersion(v);
        setUpdateInfo(u);
      })
      .catch(() => {
        setVersion(null);
        setUpdateInfo(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const currentVersion = version?.current_version ?? "—";
  const hasUpdate = !!updateInfo?.has_update && !!updateInfo?.latest?.version;
  const latest = updateInfo?.latest;

  const handleIgnore = async () => {
    if (!latest?.version || ignoreLoading) return;
    setIgnoreLoading(true);
    try {
      await ignoreVersion(latest.version);
      load();
    } finally {
      setIgnoreLoading(false);
    }
  };

  const handleCopyUpgrade = async () => {
    if (!latest?.version) return;
    try {
      const plan = await getUpgradePlan(latest.version);
      await navigator.clipboard.writeText(plan.command);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      // ignore
    }
  };

  if (loading && !version) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        加载中…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingRow label="当前版本" description="当前安装的 Bull Board 版本。">
        <span className="font-mono text-sm">{currentVersion}</span>
      </SettingRow>

      <SettingRow
        label="检查更新"
        description={
          updateInfo?.error
            ? `检测失败：${updateInfo.error}`
            : hasUpdate
              ? `发现新版本 ${latest?.version ?? ""}`
              : "当前已是最新版本。"
        }
      >
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className={btnSecondary}
        >
          {loading ? "检查中…" : "刷新"}
        </button>
      </SettingRow>

          {hasUpdate && latest && (
        <>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-2 text-sm font-medium text-foreground">
              最新版本：{latest.version}
              {latest.published_at && (
                <span className="ml-2 text-muted-foreground">
                  {latest.published_at.slice(0, 10)}
                </span>
              )}
            </p>
            {latest.notes_md && (
              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:text-muted-foreground prose-li:text-muted-foreground mt-2 border-t border-border pt-3 text-sm">
                <ReactMarkdown>{latest.notes_md}</ReactMarkdown>
              </div>
            )}
          </div>
          <SettingRow
            label="忽略此版本"
            description="忽略后更新角标将隐藏，刷新后仍生效。"
            action={
              <button
                type="button"
                onClick={handleIgnore}
                disabled={ignoreLoading}
                className={btnSecondary}
              >
                {ignoreLoading ? "处理中…" : "忽略此版本"}
              </button>
            }
          >
            <span className="text-muted-foreground" />
          </SettingRow>
          <SettingRow
            label="升级"
            description={
              copyDone
                ? "命令已复制到剪贴板，升级完成后可到「日志」页观察 bb.service 重启日志。"
                : "复制下方命令到服务器执行即可升级。"
            }
            action={
              <button
                type="button"
                onClick={handleCopyUpgrade}
                className={btnPrimary}
              >
                {copyDone ? "已复制" : "复制升级命令"}
              </button>
            }
          >
            <span className="text-muted-foreground" />
          </SettingRow>
          <SettingRow
            label="升级后观察"
            description="升级完成后，可在 Control 日志中确认服务重启与迁移输出。"
            action={
              <Link to="/dashboard/logs?unit=control" className={btnSecondary}>
                打开 Control 日志
              </Link>
            }
          >
            <span className="text-muted-foreground">
              将在新标签中固定 Control 单元，用于观察升级过程。
            </span>
          </SettingRow>
        </>
      )}
    </div>
  );
}

export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const tab: SettingsTabValue = isValidTab(tabFromUrl) ? tabFromUrl : "system";
  const settingsPath = "/settings";

  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex h-14 flex-row items-stretch rounded-lg border border-border bg-card px-4 shadow-card md:px-6">
        <nav
          className="flex min-h-0 flex-1 items-stretch gap-0 overflow-x-auto [scrollbar-width:none] md:overflow-x-visible"
          aria-label="设置分类"
        >
          {SETTINGS_TABS.map((t) => {
            const isActive = tab === t.value;
            const to = `${settingsPath}?tab=${t.value}`;
            return (
              <Link
                key={t.value}
                to={to}
                replace
                role="tab"
                aria-selected={isActive}
                className={cn(
                  "relative flex shrink-0 items-center justify-center px-4 text-sm font-medium transition-colors min-h-[44px] md:min-h-0",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索设置项"
              className="h-9 w-full rounded-full border border-border/60 bg-muted/40 pl-3 pr-9 text-xs text-foreground placeholder:text-muted-foreground outline-none caret-primary focus:border-primary focus:ring-1 focus:ring-primary md:h-9 md:w-56 md:text-sm"
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </Card>

      <Card className="rounded-lg border border-border bg-card shadow-card">
        <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 md:px-6 md:pb-5 md:pt-4">
          {tab === "system" && (
            <div className="space-y-0">
              <SettingRow
                label="应用信息"
                description="当前应用名称与基础信息（占位）。"
                action={<button type="button" className={btnPrimary}>保存</button>}
              >
                <PlaceholderInput value="Bull Board" />
              </SettingRow>
              <SettingRow
                label="时区/语言"
                description="面板显示时区与语言（占位）。"
                action={<button type="button" disabled className={btnSecondary}>设置</button>}
              >
                <PlaceholderInput value="Asia/Shanghai · 简体中文" />
              </SettingRow>
              <SettingRow
                label="模型/路由"
                description="默认模型与路由策略（占位）。"
                action={<button type="button" disabled className={btnSecondary}>设置</button>}
              >
                <PlaceholderInput value="默认" />
              </SettingRow>
              <SettingRow
                label="通知"
                description="告警与系统通知方式（占位）。"
                action={<button type="button" disabled className={btnSecondary}>告警配置</button>}
              >
                <Toggle checked={false} onChange={() => {}} disabled />
              </SettingRow>
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-0">
              <SettingRow
                label="TLS 状态"
                description="HTTPS 证书状态（只读/占位）。"
              >
                <PlaceholderInput value="未启用" />
              </SettingRow>
              <SettingRow
                label="IP 白名单"
                description="允许访问面板的 IP（占位）。"
                action={<button type="button" disabled className={btnSecondary}>设置</button>}
              >
                <PlaceholderInput value="未配置" />
              </SettingRow>
            </div>
          )}

          {tab === "access" && <AccessSection />}

          {tab === "updates" && <UpdatesSection />}

          {tab === "secrets" && (
            <div className="space-y-0">
              <SettingRow
                label="Vault"
                description="密钥存储（占位）。"
                action={<button type="button" disabled className={btnSecondary}>配置</button>}
              >
                <PlaceholderInput value="未配置" />
              </SettingRow>
              <SettingRow
                label="SSH"
                description="SSH 密钥（占位）。"
                action={<button type="button" disabled className={btnSecondary}>配置</button>}
              >
                <PlaceholderInput value="未配置" />
              </SettingRow>
              <SettingRow
                label="Gmail OAuth"
                description="邮件 OAuth（占位）。"
                action={<button type="button" disabled className={btnSecondary}>配置</button>}
              >
                <PlaceholderInput value="未配置" />
              </SettingRow>
            </div>
          )}

          {tab === "runners" && (
            <div className="space-y-0">
              <SettingRow
                label="运行与资源"
                description="Runner 列表与资源配置（占位/已实现则展示）。"
                action={
                  <button type="button" disabled className={btnSecondary}>
                    管理
                  </button>
                }
              >
                <PlaceholderInput value="暂无" />
              </SettingRow>
              <SettingRow
                label="运行日志"
                description="打开日志查看器，观察 Control 与 Runner 的 systemd 日志。"
                action={
                  <Link to="/dashboard/logs" className={btnSecondary}>
                    打开日志查看器
                  </Link>
                }
              >
                <PlaceholderInput value="bb.service / bb-runner.service" />
              </SettingRow>
            </div>
          )}

          {tab === "backup" && (
            <div className="space-y-0">
              <SettingRow
                label="SQLite 路径"
                description="数据库文件路径（占位）。"
              >
                <PlaceholderInput value="data/db/bb.sqlite" />
              </SettingRow>
              <SettingRow
                label="导出备份"
                description="导出数据备份（占位）。"
                action={<button type="button" disabled className={btnSecondary}>导出</button>}
              >
                <PlaceholderInput value="—" />
              </SettingRow>
            </div>
          )}

          {tab === "about" && <AboutSection />}
        </CardContent>
      </Card>
    </div>
  );
}

function AboutSection() {
  const [version, setVersion] = useState<{ current_version: string } | null>(null);
  useEffect(() => {
    getSystemVersion().then(setVersion).catch(() => setVersion(null));
  }, []);
  return (
    <div className="space-y-0">
      <SettingRow label="版本" description="当前应用版本，与「更新与维护」一致。">
        <span className="font-mono text-sm">
          {version?.current_version ?? "—"}
        </span>
      </SettingRow>
      <SettingRow label="链接" description="官网与文档（占位）。">
        <a
          href="https://github.com/PonyDevAI/Bull-Board"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:no-underline"
        >
          GitHub
        </a>
      </SettingRow>
    </div>
  );
}
