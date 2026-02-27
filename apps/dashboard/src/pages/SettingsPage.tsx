import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  type ApiKeyItem,
} from "@/api";
import { cn } from "@/lib/utils";

const SETTINGS_TABS = [
  { value: "general", label: "常用设置" },
  { value: "api-keys", label: "API 密钥" },
  { value: "auth", label: "认证与安全" },
  { value: "panel", label: "面板设置" },
  { value: "notifications", label: "告警通知" },
] as const;

const TAB_VALUES = new Set(SETTINGS_TABS.map((t) => t.value));
function isValidTab(v: string | null): v is (typeof SETTINGS_TABS)[number]["value"] {
  return v !== null && TAB_VALUES.has(v);
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
    <div className="flex flex-col gap-1 border-b border-border bg-card py-2.5 last:border-b-0 md:flex-row md:items-center md:gap-3">
      <div className="w-full shrink-0 text-sm font-medium text-foreground md:w-[140px] md:shrink-0">
        {label}
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
        {action}
        {description && (
          <span
            className={cn(
              "text-sm",
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

/** 占位输入（只读灰底，标准尺寸） */
function PlaceholderInput({ value }: { value: string }) {
  return (
    <input
      type="text"
      readOnly
      value={value}
      className="h-8 max-w-md rounded border border-border bg-background px-2.5 text-xs text-foreground md:h-8 md:min-w-[200px] md:px-3 md:text-sm"
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
        // 防御：后端若返回 null / 非数组，统一视为无数据，避免 length 报错
        if (Array.isArray(res)) {
          setList(res);
        } else {
          setList([]);
        }
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
              className="h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring md:min-w-[180px]"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="h-10 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
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
            className="mt-2 h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
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
                  <span className="ml-2 text-xs text-muted-foreground">{k.createdAt ?? ""}</span>
                  {k.revokedAt && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">已撤销</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!k.revokedAt && (
                    <button
                      type="button"
                      onClick={() => revokeApiKey(k.id).then(load)}
                      className="h-10 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                    >
                      撤销
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteApiKey(k.id).then(load)}
                    className="h-10 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
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

/** 主按钮（标准尺寸，与 UI_GUIDE h-10 px-4 一致） */
const btnPrimary =
  "inline-flex h-8 items-center justify-center rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 md:h-8 md:px-3.5 md:text-sm";
/** 次按钮（标准尺寸） */
const btnSecondary =
  "inline-flex h-8 items-center justify-center rounded border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted md:h-8 md:px-3.5 md:text-sm";

export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const tab = isValidTab(tabFromUrl) ? tabFromUrl : "general";
  const settingsPath = "/settings";

  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col gap-3">
      {/* 上方：Tab 卡片与 Tab 按钮同高，文字上下居中，下划线贴卡片底边 */}
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
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                  {/* 激活态：下划线 20px 宽、贴住 Tab 卡片底边、水平居中 */}
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
                className="h-9 w-full rounded-full border border-border/60 bg-muted/40 pl-3 pr-9 text-xs text-foreground outline-none placeholder:text-muted-foreground md:h-9 md:w-56 md:text-sm"
              />
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
      </Card>

      {/* 下方：设置内容区块（独立白色卡片） */}
      <Card className="rounded-lg border border-border bg-card shadow-card">
        <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 md:px-6 md:pb-5 md:pt-4">
          {tab === "general" && (
            <div className="space-y-0">
              <SettingRow
                label="面板账号"
                description="用于登录面板的用户名，可使用字母、数字或下划线。"
                action={
                  <button type="button" className={btnPrimary}>
                    保存
                  </button>
                }
              >
                <PlaceholderInput value="r1whs8w9" />
              </SettingRow>
              <SettingRow
                label="面板密码"
                description="建议定期更改密码，并使用数字+字母+符号提升安全性。"
                action={
                  <button type="button" className={btnPrimary}>
                    设置
                  </button>
                }
              >
                <PlaceholderInput value="********" />
              </SettingRow>
              <SettingRow
                label="绑定手机号"
                description="用于找回密码与安全提醒，仅用于安全校验，不会对外展示。"
                action={
                  <button type="button" className={btnPrimary}>
                    绑定
                  </button>
                }
              >
                <PlaceholderInput value="200****8853" />
              </SettingRow>
              <SettingRow
                label="面板端口"
                description="范围 8888-65535。注意：有安全组的服务器需提前放行新端口，否则可能无法访问面板。"
                danger
                action={
                  <button type="button" className={btnPrimary}>
                    设置
                  </button>
                }
              >
                <PlaceholderInput value="11123" />
              </SettingRow>
              <SettingRow
                label="安全入口"
                description="开启安全入口后，仅通过带安全前缀的地址才能访问面板，示例：/cb0c0876。"
                action={
                  <button type="button" className={btnPrimary}>
                    设置
                  </button>
                }
              >
                <PlaceholderInput value="/cb0c0876" />
              </SettingRow>
              <SettingRow
                label="开发者模式"
                description="仅供二次开发者在开发/调试时开启，普通用户请保持关闭。"
              >
                <Toggle checked={false} onChange={() => {}} />
              </SettingRow>
            </div>
          )}

          {tab === "api-keys" && <ApiKeysSection />}

          {tab === "auth" && (
            <div className="space-y-0">
              <SettingRow
                label="登录方式"
                description="当前为本地账号登录；后续可支持 OAuth"
                action={
                  <button type="button" disabled className={btnPrimary}>
                    设置
                  </button>
                }
              >
                <PlaceholderInput value="本地账号" />
              </SettingRow>
              <SettingRow
                label="Session 过期"
                description="超过该时间未操作将自动退出登录"
                action={
                  <button type="button" disabled className={btnPrimary}>
                    设置
                  </button>
                }
              >
                <PlaceholderInput value="7 天" />
              </SettingRow>
            </div>
          )}

          {tab === "panel" && (
            <div className="space-y-0">
              <SettingRow
                label="超时时间"
                description="用户超过该时间未操作面板将自动退出登录"
                action={
                  <button type="button" disabled className={btnPrimary}>
                    设置
                  </button>
                }
              >
                <PlaceholderInput value="24 小时" />
              </SettingRow>
              <SettingRow
                label="面板端口"
                description="建议端口范围 8888-65535。注意：有安全组的服务器请提前在安全组放行新端口"
                danger
                action={
                  <button type="button" disabled className={btnPrimary}>
                    设置
                  </button>
                }
              >
                <PlaceholderInput value="6666" />
              </SettingRow>
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-0">
              <SettingRow
                label="告警通知"
                description="有更新或异常时提醒方式（占位）"
                action={
                  <button type="button" disabled className={btnSecondary + " opacity-50"}>
                    告警配置
                  </button>
                }
              >
                <Toggle checked={false} onChange={() => {}} disabled />
              </SettingRow>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
