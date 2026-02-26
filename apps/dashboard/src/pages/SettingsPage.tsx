import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SETTINGS_TABS = [
  { value: "general", label: "General" },
  { value: "auth", label: "Auth & Access" },
  { value: "runners", label: "Runners" },
  { value: "models", label: "Models" },
  { value: "roles", label: "Roles & Routing" },
  { value: "security", label: "Security" },
  { value: "notifications", label: "Notifications" },
] as const;

function FormPlaceholder({
  title,
  description,
  fields,
}: {
  title: string;
  description?: string;
  fields: { label: string; type?: string; placeholder?: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((f, i) => (
          <div key={i} className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {f.label}
            </label>
            <input
              type={f.type ?? "text"}
              placeholder={f.placeholder}
              className="w-full max-w-md rounded-global-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              readOnly
              disabled
            />
          </div>
        ))}
        <div className="pt-2">
          <Button size="sm" variant="outline" disabled>
            保存（占位）
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState("general");

  return (
    <div className="space-y-block">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap gap-1 border-b border-border pb-2 mb-4 overflow-x-auto">
          {SETTINGS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general">
          <FormPlaceholder
            title="General"
            description="应用名称与默认时区（mock）"
            fields={[
              { label: "应用名称", placeholder: "Bull Board" },
              { label: "时区", placeholder: "Asia/Shanghai" },
              { label: "语言", placeholder: "简体中文" },
            ]}
          />
        </TabsContent>

        <TabsContent value="auth">
          <FormPlaceholder
            title="Auth & Access"
            description="登录与权限（mock）"
            fields={[
              { label: "登录方式", placeholder: "Local / OAuth" },
              { label: "Session 过期", placeholder: "24 小时" },
              { label: "默认角色", placeholder: "viewer" },
            ]}
          />
        </TabsContent>

        <TabsContent value="runners">
          <FormPlaceholder
            title="Runners"
            description="Runner 注册与配额（mock）"
            fields={[
              { label: "最大 Runner 数", placeholder: "10" },
              { label: "心跳间隔", placeholder: "30s" },
              { label: "离线阈值", placeholder: "90s" },
            ]}
          />
        </TabsContent>

        <TabsContent value="models">
          <FormPlaceholder
            title="Models"
            description="模型配置（mock）"
            fields={[
              { label: "默认模型", placeholder: "gpt-4" },
              { label: "备用模型", placeholder: "gpt-3.5-turbo" },
              { label: "超时", placeholder: "60s" },
            ]}
          />
        </TabsContent>

        <TabsContent value="roles">
          <FormPlaceholder
            title="Roles & Routing"
            description="角色与路由规则（mock）"
            fields={[
              { label: "角色列表", placeholder: "admin, editor, viewer" },
              { label: "默认路由", placeholder: "round-robin" },
              { label: "模型映射", placeholder: "role -> model" },
            ]}
          />
        </TabsContent>

        <TabsContent value="security">
          <FormPlaceholder
            title="Security"
            description="安全与审计（mock）"
            fields={[
              { label: "API 密钥轮换", placeholder: "90 天" },
              { label: "IP 白名单", placeholder: "可选" },
              { label: "审计日志保留", placeholder: "30 天" },
            ]}
          />
        </TabsContent>

        <TabsContent value="notifications">
          <FormPlaceholder
            title="Notifications"
            description="告警与通知（mock）"
            fields={[
              { label: "邮件 SMTP", placeholder: "smtp.example.com" },
              { label: "Webhook URL", placeholder: "https://..." },
              { label: "告警级别", placeholder: "error, warn" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
